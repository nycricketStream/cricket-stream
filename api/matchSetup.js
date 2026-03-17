import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {

    if (req.method === 'POST') {
      const setup = req.body;

      await kv.set('matchSetup', setup);

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const data = await kv.get('matchSetup');

      return res.status(200).json(data || {});
    }

    if (req.method === 'DELETE') {
      await kv.del('matchSetup');

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error("MATCH SETUP ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
