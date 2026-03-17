import { kv } from '@vercel/kv';

export default async function handler(req, res){

 if(req.method === 'POST'){
  await kv.set('matchSetup', req.body);
  return res.status(200).json({ ok:true });
 }

 if(req.method === 'GET'){
  const data = await kv.get('matchSetup');
  return res.status(200).json(data || {});
 }

 if(req.method === 'DELETE'){
  await kv.del('matchSetup');
  return res.status(200).json({ ok:true });
 }

 res.status(405).end();
}
