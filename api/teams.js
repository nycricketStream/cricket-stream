import { kv } from '@vercel/kv';

const defaultColors = {
  primaryColor: '#0A1A3F',
  accentColor: '#D4A017',
  textColor: '#FFFFFF'
};

function normalizeColor(value, fallback) {
  const clean = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean.toUpperCase() : fallback;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const {
        name,
        logo,
        players,
        primaryColor,
        accentColor,
        textColor
      } = req.body || {};

      if (!name) return res.status(400).json({ error: 'No name' });

      await kv.set(`team:${name}`, {
        name,
        logo: logo || '',
        primaryColor: normalizeColor(primaryColor, defaultColors.primaryColor),
        accentColor: normalizeColor(accentColor, defaultColors.accentColor),
        textColor: normalizeColor(textColor, defaultColors.textColor),
        players: Array.isArray(players) ? players : []
      });

      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const keys = await kv.keys('team:*');
      const teams = [];

      for (const key of keys) {
        const data = await kv.get(key);
        if (data) teams.push(data);
      }

      return res.status(200).json(teams);
    }

    if (req.method === 'DELETE') {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ error: 'No name' });

      await kv.del(`team:${name}`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('teams.js error:', err);
    return res.status(500).json({ error: err.message });
  }
}
