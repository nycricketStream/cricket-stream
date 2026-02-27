
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    await redis.set('broadcast-config', req.body);
    return res.status(200).json({ ok: true });
  }

  const config = await redis.get('broadcast-config');
  return res.status(200).json(config || {});
}
