import { kv } from '@vercel/kv';

export default async function handler(req, res) {

    if (req.method === 'POST') {
        const { name, players } = req.body;

        await kv.set(`team:${name}`, { name, players });

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
