function decodeHtml(value) {
    return String(value || "")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanText(value) {
    return decodeHtml(
        String(value || "")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]*>/g, " ")
    );
}

function firstMatch(html, regex) {
    const m = html.match(regex);
    return m ? m[1] : "";
}

function absoluteUrl(value, baseUrl) {
    if (!value) return "";
    try {
        return new URL(decodeHtml(value), baseUrl).href;
    } catch {
        return decodeHtml(value);
    }
}

function getMeta(html, prop) {
    return firstMatch(
        html,
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")
    );
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { url, html: postedHtml } = req.body || {};

    if (!url || !url.includes("cricclubs.com")) {
        return res.status(400).json({ error: "Valid CricClubs URL required" });
    }

    const html = postedHtml || "";

    if (!html) {
        return res.status(400).json({
            error: "No HTML received. Paste CricClubs page source HTML."
        });
    }

    if (
        html.includes("Just a moment") ||
        html.includes("challenges.cloudflare.com")
    ) {
        return res.status(403).json({
            error: "This is a Cloudflare page, not the CricClubs team page."
        });
    }

    try {
        const ogTitle = decodeHtml(getMeta(html, "og:title"));
        const ogImage = getMeta(html, "og:image");

        let teamName = "";

        if (ogTitle.includes(":")) {
            teamName = ogTitle.split(":").slice(1).join(":").split(" - ")[0].trim();
        }

        if (!teamName) {
            teamName = cleanText(
                firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
            );
        }

        teamName = teamName
            .replace(/CricClubs/ig, "")
            .replace(/View Team/ig, "")
            .replace(/New York National Cricket League/ig, "")
            .replace(/[-|]+$/g, "")
            .trim();

        const teamLogo = absoluteUrl(ogImage, url);

        const players = [];
        const seen = new Set();

        const allPlayersHtml =
            firstMatch(html, /<div[^>]+id=["']allPlayersDiv["'][^>]*>([\s\S]*?)<\/body>/i) ||
            html;

        const playerCardRegex =
            /<div[^>]+class=["'][^"']*col-sm-3[^"']*["'][^>]+id=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<a[^>]+href=["']([^"']*viewPlayer\.do[^"']*)["']/gi;

        let match;

        while ((match = playerCardRegex.exec(allPlayersHtml)) !== null) {
            const idName = cleanText(match[1]);
            const img = absoluteUrl(match[2], url);
            const h4Name = cleanText(match[3]);
            const name = h4Name || idName;

            if (!name) continue;

            const key = name.toLowerCase();

            if (!seen.has(key)) {
                seen.add(key);
                players.push({
                    name,
                    image: img
                });
            }
        }

        return res.status(200).json({
            teamName,
            teamLogo,
            players
        });

    } catch (err) {
        return res.status(500).json({
            error: err.message || "Failed to parse CricClubs HTML"
        });
    }
}
