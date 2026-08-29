import { kv } from '@vercel/kv';

const YOUTUBE_API_BASE_URL =
    'https://www.googleapis.com/youtube/v3';

const FACEBOOK_GRAPH_VERSION = 'v25.0';

function validateEnvironment() {
    const required = [
        'CRON_SECRET',
        'YOUTUBE_API_KEY',
        'YOUTUBE_CHANNEL_ID',
        'FACEBOOK_PAGE_ID',
        'FACEBOOK_PAGE_ACCESS_TOKEN'
    ];

    return required.filter(name => !process.env[name]?.trim());
}

async function getCurrentLiveStream() {
    const channelId = process.env.YOUTUBE_CHANNEL_ID.trim();
    const apiKey = process.env.YOUTUBE_API_KEY.trim();

    const params = new URLSearchParams({
        part: 'snippet',
        channelId,
        eventType: 'live',
        type: 'video',
        maxResults: '1',
        key: apiKey
    });

    const url =
        `${YOUTUBE_API_BASE_URL}/search?${params.toString()}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        }
    });

    const data = await response.json();

    if (!response.ok) {
        const message =
            data?.error?.message ||
            `YouTube API returned HTTP ${response.status}`;

        throw new Error(`YouTube API failed: ${message}`);
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
        return null;
    }

    const item = data.items[0];
    const videoId = item?.id?.videoId;

    if (!videoId) {
        throw new Error(
            'YouTube returned a live item without a video ID'
        );
    }

    return {
        videoId,
        title: item.snippet?.title || 'NY Eagles CC Live',
        description: item.snippet?.description || '',
        publishedAt: item.snippet?.publishedAt || null,
        thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            null,
        youtubeUrl:
            `https://www.youtube.com/watch?v=${videoId}`
    };
}

async function postToFacebook(liveStream) {
    const pageId = process.env.FACEBOOK_PAGE_ID.trim();
    const pageToken =
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN.trim();

    const message = `🔴 LIVE NOW

${liveStream.title}

Watch Live:
${liveStream.youtubeUrl}`;

    const body = new URLSearchParams({
        message,
        link: liveStream.youtubeUrl,
        access_token: pageToken
    });

    const response = await fetch(
        `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}/feed`,
        {
            method: 'POST',
            headers: {
                'Content-Type':
                    'application/x-www-form-urlencoded'
            },
            body: body.toString()
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const message =
            data?.error?.message ||
            `Facebook returned HTTP ${response.status}`;

        const error = new Error(
            `Facebook post failed: ${message}`
        );

        error.facebookResponse = data;
        throw error;
    }

    return data;
}

export default async function handler(req, res) {
    try {
        if (req.method !== 'GET' && req.method !== 'POST') {
            return res.status(405).json({
                error: 'Method not allowed'
            });
        }

        const missingEnvironmentVariables =
            validateEnvironment();

        if (missingEnvironmentVariables.length > 0) {
            return res.status(500).json({
                error: 'Missing environment variables',
                missing: missingEnvironmentVariables
            });
        }

        if (
            req.query.secret !==
            process.env.YOUTUBE_FACEBOOK_SECRET.trim()
        ) {
            return res.status(401).json({
                error: 'Unauthorized'
            });
        }

        const liveStream =
            await getCurrentLiveStream();

        if (!liveStream) {
            return res.status(200).json({
                posted: false,
                live: false,
                reason: 'YouTube channel is not currently live'
            });
        }

        const kvKey =
            `youtubeFbPosted:${liveStream.videoId}`;

        const existingPost =
            await kv.get(kvKey);

        if (existingPost) {
            return res.status(200).json({
                posted: false,
                live: true,
                reason: 'Live stream was already posted to Facebook',
                videoId: liveStream.videoId,
                title: liveStream.title,
                youtubeUrl: liveStream.youtubeUrl,
                existingPost
            });
        }

        const facebookResult =
            await postToFacebook(liveStream);

        const postRecord = {
            videoId: liveStream.videoId,
            title: liveStream.title,
            youtubeUrl: liveStream.youtubeUrl,
            publishedAt: liveStream.publishedAt,
            facebookPostId:
                facebookResult?.id || null,
            postedAt: new Date().toISOString()
        };

        await kv.set(kvKey, postRecord);

        return res.status(200).json({
            posted: true,
            live: true,
            videoId: liveStream.videoId,
            title: liveStream.title,
            youtubeUrl: liveStream.youtubeUrl,
            facebook: facebookResult
        });

    } catch (err) {
        console.error(
            'youtube-to-facebook error:',
            err
        );

        return res.status(500).json({
            error:
                err.message ||
                'Unknown server error',
            facebook:
                err.facebookResponse || undefined
        });
    }
}
