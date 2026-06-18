import { kv } from "@vercel/kv";
import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    if (req.query.secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    if (!channelId) {
      return res.status(400).json({ error: "Missing YOUTUBE_CHANNEL_ID" });
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
    const title = latest.title || "NYC Eagles Live";
    const youtubeUrl = latest.link?.["@_href"] || `https://youtu.be/${videoId}`;

    if (!videoId) {
      return res.status(400).json({ error: "Could not read YouTube video ID" });
    }

    const alreadyPosted = await kv.get(`youtubeFbPosted:${videoId}`);

    if (alreadyPosted) {
      return res.status(200).json({
        posted: false,
        reason: "Already posted",
        videoId,
        title,
        youtubeUrl
      });
    }

    const message = `🔴 LIVE NOW

${title}

Watch Live:
${youtubeUrl}`;

    const fbResponse = await fetch(
      `https://graph.facebook.com/${process.env.FACEBOOK_PAGE_ID}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN
        })
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      return res.status(500).json({
        error: "Facebook post failed",
        facebook: fbResult
      });
    }

    await kv.set(`youtubeFbPosted:${videoId}`, {
      videoId,
      title,
      youtubeUrl,
      facebookPost: fbResult,
      postedAt: new Date().toISOString()
    });

    return res.status(200).json({
      posted: true,
      videoId,
      title,
      youtubeUrl,
      facebook: fbResult
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
