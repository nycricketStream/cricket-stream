import { kv } from '@vercel/kv';

export default async function handler(req, res) {

    if (req.method === 'POST') {
        try {

            const { logo, size } = req.body;

            await kv.set('branding:config', {
                logo: logo || '',
                size: size || '40'
            });

            return res.json({ success: true });

        } catch (err) {
            return res.status(500).json({
                error: 'Failed to save'
            });
        }
    }

    if (req.method === 'GET') {
        try {

            const data = await kv.get('branding:config');

            return res.json(
                data || {
                    logo: '',
                    size: '40'
                }
            );

        } catch (err) {
            return res.status(500).json({
                error: 'Failed to load'
            });
        }
    }

    res.status(405).end();
}
