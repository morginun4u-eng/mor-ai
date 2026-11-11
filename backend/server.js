const http = require("node:http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

const APP_TOKEN = (process.env.MOR_AI_APP_TOKEN || "").trim();

const instructions = `
את MOR AI, עוזרת קולית חכמה לרכב.
דברי בעברית טבעית, ידידותית וקצרה.
עזרי בשאלות כלליות ובתכנון נסיעות.
אל תמציאי תחנות טעינה או זמינות בזמן אמת.
אל תטעני שביצעת שיחה או שלחת הודעה
אם אפליקציית הטלפון לא אישרה את הפעולה.
אם שם של איש קשר אינו ברור, בקשי הבהרה.
`;

function reply(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return reply(res, 200, { status: "ok" });
  }

  if (req.method !== "POST" || req.url !== "/chat") {
    return reply(res, 404, { error: "Not found" });
  }

  if (!API_KEY || !APP_TOKEN) {
    return reply(res, 503, { error: "Not configured" });
  }

  const suppliedToken = (req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (suppliedToken !== APP_TOKEN) {
    return reply(res, 401, { error: "Unauthorized" });
  }


  try {
    let raw = "";

    for await (const chunk of req) {
      raw += chunk.toString();

      if (raw.length > 12000) {
        return reply(res, 413, { error: "Too large" });
      }
    }

    const { message } = JSON.parse(raw);

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 3000
    ) {
      return reply(res, 400, { error: "Invalid message" });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: {
          Authorization: "Bearer " + API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions,
          input: message,
          max_output_tokens: 350
        })
      }
    );

    if (!response.ok) {
      return reply(res, 502, {
        error: "AI unavailable"
      });
    }

    const data = await response.json();

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text)
      .join("\n");

    return reply(res, 200, { answer });

  } catch (error) {
    console.error(error.message);

    return reply(res, 500, {
      error: "Request failed"
    });
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log("MOR AI backend running");
});
