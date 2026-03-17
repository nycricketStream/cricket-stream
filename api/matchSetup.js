import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {

    // SAVE MATCH
    if (req.method === 'POST') {
      const { id, data } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Missing match id" });
      }

      await kv.set(`match:${id}`, data);

      // also keep index of matches
      let list = await kv.get('matchList') || [];
      if (!list.includes(id)) {
        list.push(id);
        await kv.set('matchList', list);
      }

      return res.status(200).json({ ok: true });
    }

    // LOAD ONE MATCH
    if (req.method === 'GET') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }

      const data = await kv.get(`match:${id}`);
      return res.status(200).json(data || {});
    }

    // GET ALL MATCHES
    if (req.method === 'PUT') {
      const list = await kv.get('matchList') || [];
      return res.status(200).json(list);
    }

    // DELETE MATCH
    if (req.method === 'DELETE') {
      const { id } = req.body;

      await kv.del(`match:${id}`);

      let list = await kv.get('matchList') || [];
      list = list.filter(x => x !== id);
      await kv.set('matchList', list);

      return res.status(200).json({ ok: true });
    }

    res.status(405).end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
