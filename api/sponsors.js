import { kv } from '@vercel/kv';

export default async function handler(req, res) {

    // SAVE
    if (req.method === 'POST') {
        const { presets, duration } = req.body;

        await kv.set('sponsors:config', {
            presets: presets || {},
            duration: duration || 8
        });

        return res.json({ success: true });
    }

    // LOAD
    if (req.method === 'GET') {
        const data = await kv.get('sponsors:config');

        return res.json(data || { presets: {}, duration: 8 });
    }

    res.status(405).end();
}
