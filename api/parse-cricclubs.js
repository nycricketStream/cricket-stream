function absoluteUrl(value, baseUrl) {
    if (!value) return "";
    try {
        return new URL(value, baseUrl).href;
    } catch {
        return value;
    }
}

function cleanText(value) {
    return String(value || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function firstMatch(html, regex) {
    const m = html.match(regex);
    return m ? m[1] : "";
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { url } = req.body || {};

    if (!url || !url.includes("cricclubs.com")) {
        return res.status(400).json({ error: "Valid Cricclubs URL required" });
    }

    try {

        const page = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                "Referer": "https://cricclubs.com/",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            }
        });
    
        console.log("================================");
        console.log("CRICCLUBS REQUEST");
        console.log("URL:", url);
        console.log("STATUS:", page.status);
        console.log("================================");
    
        const html = await page.text();
    
        console.log("FIRST 1000 CHARS:");
        console.log(html.substring(0, 1000));
        console.log("================================");
    
        if (!page.ok) {
            return res.status(page.status).json({
                error: `Cricclubs page failed: ${page.status}`,
                preview: html.substring(0, 1000)
            });
        }
    
        let teamName = cleanText(
            firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
            firstMatch(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
            firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
        );

        teamName = teamName
            .replace(/CricClubs/ig, "")
            .replace(/View Team/ig, "")
            .replace(/[-|]+$/g, "")
            .trim();

        const teamLogoRaw =
            firstMatch(html, /<img[^>]+(?:class|id)=["'][^"']*(?:team|logo)[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
            firstMatch(html, /<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id)=["'][^"']*(?:team|logo)[^"']*["']/i);

        const teamLogo = absoluteUrl(teamLogoRaw, url);

        const players = [];
        const seen = new Set();

        const imgNameRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]{0,500}?<a[^>]*>([\s\S]*?)<\/a>/gi;

        let match;
        while ((match = imgNameRegex.exec(html)) !== null) {
            const image = absoluteUrl(match[1], url);
            const name = cleanText(match[2]);

            if (
                name &&
                image &&
                !seen.has(name.toLowerCase()) &&
                !/view|scorecard|schedule|points|club/i.test(name)
            ) {
                seen.add(name.toLowerCase());
                players.push({ name, image });
            }
        }

        if (players.length === 0) {
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let row;

            while ((row = rowRegex.exec(html)) !== null) {
                const rowHtml = row[1];

                const img = firstMatch(rowHtml, /<img[^>]+src=["']([^"']+)["']/i);
                const cols = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
                    .map(x => cleanText(x[1]))
                    .filter(Boolean);

                const name = cols.find(c =>
                    /^[A-Za-z][A-Za-z .'-]{2,}$/.test(c) &&
                    !/bat|bowl|role|player|jersey|team/i.test(c)
                );

                if (name && !seen.has(name.toLowerCase())) {
                    seen.add(name.toLowerCase());
                    players.push({
                        name,
                        image: absoluteUrl(img, url)
                    });
                }
            }
        }

        return res.status(200).json({
            teamName,
            teamLogo,
            players
        });

    } catch (err) {
        return res.status(500).json({
            error: err.message || "Failed to parse Cricclubs"
        });
    }
}
