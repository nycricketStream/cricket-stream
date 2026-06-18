import { kv } from "@vercel/kv";
import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.CRON_SECRET) {
      return res.status(500).json({ error: "Missing CRON_SECRET" });
    }

    if (req.query.secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    const facebookPageId = process.env.FACEBOOK_PAGE_ID;
    const facebookPageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!channelId) {
      return res.status(400).json({ error: "Missing YOUTUBE_CHANNEL_ID" });
    }

    if (!facebookPageId) {
      return res.status(400).json({ error: "Missing FACEBOOK_PAGE_ID" });
    }

    if (!facebookPageToken) {
      return res.status(400).json({ error: "Missing FACEBOOK_PAGE_ACCESS_TOKEN" });
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const rssResponse = await fetch(rssUrl);

    if (!rssResponse.ok) {
      return res.status(500).json({
        error: `YouTube RSS failed: ${rssResponse.status}`
      });
    }

    const xml = await rssResponse.text();

    const parser = new XMLParser({
      ignoreAttributes: false
    });

    const feed = parser.parse(xml);
    const entries = feed.feed?.entry;

    if (!entries) {
      return res.status(404).json({ error: "No YouTube videos found" });
    }

    const latest = Array.isArray(entries) ? entries[0] : entries;

    const videoId = latest["yt:videoId"];
    const title = latest.title || "NY Eagles CC Live";
    const published = latest.published || null;
    const updated = latest.updated || null;
    const youtubeUrl =
      latest.link?.["@_href"] ||
      `https://www.youtube.com/watch?v=${videoId}`;

    if (!videoId) {
      return res.status(400).json({ error: "Could not read YouTube video ID" });
    }

    const kvKey = `youtubeFbPosted:${videoId}`;
    const alreadyPosted = await kv.get(kvKey);

    if (alreadyPosted) {
      return res.status(200).json({
        posted: false,
        reason: "Already posted",
        videoId,
        title,
        youtubeUrl,
        previousPost: alreadyPosted
      });
    }

    const message = `🔴 LIVE NOW

${title}

Watch Live:
${youtubeUrl}`;

    const fbResponse = await fetch(
      `https://graph.facebook.com/v25.0/${facebookPageId}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          access_token: facebookPageToken
        })
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      return res.status(500).json({
        error: "Facebook post failed",
        videoId,
        title,
        youtubeUrl,
        facebook: fbResult
      });
    }

    const savedPost = {
      videoId,
      title,
      youtubeUrl,
      published,
      updated,
      facebookPost: fbResult,
      postedAt: new Date().toISOString()
    };

    await kv.set(kvKey, savedPost);

    return res.status(200).json({
      posted: true,
      videoId,
      title,
      youtubeUrl,
      facebook: fbResult
    });
  } catch (err) {
    console.error("youtube-to-facebook error:", err);
    return res.status(500).json({
      error: err.message || "Unknown server error"
    });
  }
}
