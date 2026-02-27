
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {

  // 🔐 PROTECTION GOES HERE
  /*if (req.method === 'POST') {
    if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }*/

    await redis.set('broadcast-config', req.body);
    return res.status(200).json({ ok: true });
  }

  const config = await redis.get('broadcast-config');
  return res.status(200).json(config || {});
}
