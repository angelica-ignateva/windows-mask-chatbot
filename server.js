// server.js (ESM) — OpenAI-only

import express from "express";
import path from "path";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import morgan from "morgan";
import os from "os";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/,"");

// Middlewares
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "5mb" }));

// Serve static files from the project root (works with index.html in repo root)
app.use(
  express.static(__dirname, {
    etag: false,
    lastModified: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    },
  })
);

// Health
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    hostname: os.hostname(),
    hasOpenAI: Boolean(OPENAI_API_KEY),
    openaiURL: `${OPENAI_BASE_URL}/chat/completions`,
  });
});

// Chat endpoint — OpenAI only
app.post("/api/chat", async (req, res) => {
  try {
    // inside app.post("/api/chat", …)
    const model = "gpt-4o"; // force ChatGPT-4o
    const { messages, temperature = 0.2, max_tokens = 1024 } = req.body || {};

    // const { model = process.env.MODEL_NAME || "gpt-4o", messages, temperature = 0.2, max_tokens = 1024 } = req.body || {};
    // if (!Array.isArray(messages)) return res.status(400).json({ error: "messages must be an array" });
    // if (!OPENAI_API_KEY) return res.status(400).json({ error: "OpenAI key missing on server" });

    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).send(text);
    }
    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Fallback to index.html in repo root
app.get(/.*/, (_req, res) => {
  const indexPath = path.join(__dirname, "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send("index.html not found");
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`➡️  OpenAI ${OPENAI_API_KEY ? "enabled" : "disabled"} at ${OPENAI_BASE_URL}`);
});
