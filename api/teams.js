import { kv } from '@vercel/kv';

export default async function handler(req, res) {

    if (req.method === 'POST') {
        const { name, logo, players } = req.body;

        if (!name) return res.status(400).json({ error: 'No name' });

        await kv.set(`team:${name}`, { name, logo, players });

        return res.json({ success: true });
    }

    if (req.method === 'GET') {
        const keys = await kv.keys('team:*');

        const teams = [];

        for (const key of keys) {
            const data = await kv.get(key);
            teams.push(data);
        }

        return res.json(teams);
    }

    if (req.method === 'DELETE') {
        const { name } = req.body;
        await kv.del(`team:${name}`);
        return res.json({ success: true });
    }

    res.status(405).end();
}
