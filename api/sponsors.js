import { kv } from '@vercel/kv';

export default async function handler(req, res) {

    if (req.method === 'POST') {
        try {
            const { presets, duration } = req.body;

            await kv.set('sponsors:config', {
                presets: presets || {},
                duration: duration || 8
            });

            return res.json({ success: true });

        } catch (err) {
            return res.status(500).json({ error: 'Failed to save' });
        }
    }

    if (req.method === 'GET') {
        try {
            const data = await kv.get('sponsors:config');

            return res.json(data || { presets: {}, duration: 8 });

        } catch (err) {
            return res.status(500).json({ error: 'Failed to load' });
        }
    }

    res.status(405).end();
}
