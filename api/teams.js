import { kv } from '@vercel/kv';

const defaultColors = {
    primaryColor: '#0A1A3F',
    accentColor: '#D4A017',
    textColor: '#FFFFFF'
};

function normalizeColor(value, fallback) {
    const clean = String(value || '').trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
        return clean.toUpperCase();
    }

    return fallback;
}


export default async function handler(req, res) {


    // SAVE TEAM
    if (req.method === 'POST') {

        try {

            const {
                name,
                logo,
                players,
                primaryColor,
                accentColor,
                textColor
            } = req.body;


            if (!name) {
                return res.status(400).json({
                    error: 'Missing team name'
                });
            }


            await kv.set(`team:${name}`, {
                name,
                logo: logo || '',
                players: Array.isArray(players) ? players : [],

                primaryColor: normalizeColor(
                    primaryColor,
                    defaultColors.primaryColor
                ),

                accentColor: normalizeColor(
                    accentColor,
                    defaultColors.accentColor
                ),

                textColor: normalizeColor(
                    textColor,
                    defaultColors.textColor
                )
            });


            return res.json({
                success: true
            });


        } catch (err) {

            return res.status(500).json({
                error: 'Failed to save team',
                details: err.message
            });

        }

    }



    // LOAD TEAMS
    if (req.method === 'GET') {

        try {

            const keys = await kv.keys('team:*');

            const teams = [];


            for (const key of keys) {

                const team = await kv.get(key);

                if (team) {
                    teams.push(team);
                }

            }


            return res.json(teams);


        } catch (err) {

            return res.status(500).json({
                error: 'Failed to load teams',
                details: err.message
            });

        }

    }



    // DELETE TEAM
    if (req.method === 'DELETE') {

        try {

            const { name } = req.body;


            if (!name) {
                return res.status(400).json({
                    error: 'Missing team name'
                });
            }


            await kv.del(`team:${name}`);


            return res.json({
                success: true
            });


        } catch (err) {

            return res.status(500).json({
                error: 'Failed to delete team',
                details: err.message
            });

        }

    }


    res.status(405).end();

}
