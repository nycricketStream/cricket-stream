
import { kv } from '@vercel/kv';
export default async function handler(req,res){
 if(req.method==='POST'){await kv.set('broadcast-config',req.body);return res.status(200).json({ok:true});}
 const config=await kv.get('broadcast-config');
 return res.status(200).json(config||{});
}
