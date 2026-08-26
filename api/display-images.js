import { kv } from '@vercel/kv';

const DISPLAY_IMAGES_KEY = 'display-images:presets';

function normalizePresets(value) {
    const source = value && typeof value === 'object' ? value : {};
    const presets = {};

    for (let i = 1; i <= 10; i++) {
        const key = `displayImagePreset${i}`;
        presets[key] = String(source[key] || '').trim();
    }

    return presets;
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const data = await kv.get(DISPLAY_IMAGES_KEY);
        return res.json({
            presets: normalizePresets(data?.presets || data)
        });
    }

    if (req.method === 'POST') {
        const presets = normalizePresets(req.body?.presets);
        await kv.set(DISPLAY_IMAGES_KEY, {
            presets,
            updatedAt: Date.now()
        });

        return res.json({ success: true });
    }

    res.status(405).end();
}
