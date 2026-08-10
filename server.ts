import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { routeChat, getAvailableModels, getModel } from "./server/aiRouter";
import { attachControlServer, getPairCode, getLanIp, getRecentMessages, getClientCount } from "./server/controlServer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Phone controller assets must never be cached, otherwise an old
// controller.js/html keeps running on the phone after an update.
app.use("/controller", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  next();
});

// Phone controller pairing info (shown on the computer screen)
app.get("/api/control/info", (_req, res) => {
  res.json({ code: getPairCode(), ip: getLanIp(), port: PORT });
});

// Debug: last few messages received from the paired phone controller.
app.get("/api/control/debug", (_req, res) => {
  res.json({ messages: getRecentMessages(), clients: getClientCount() });
});

// Clean phone-controller URL (/controller -> controller.html). Served before
// the Vite SPA middleware / static fallback so it doesn't load the lab app.
app.get("/controller", (_req, res) => {
  res.redirect("/controller.html");
});

// API routes
app.get("/api/nova/models", (_req, res) => {
  res.json({ models: getAvailableModels() });
});

app.post("/api/nova/chat", async (req, res) => {
  try {
    const { message, experiment, model, language } = req.body || {};

    const selected = getModel(model);
    const result = await routeChat({
      message,
      experiment,
      model: selected?.id,
      language,
    });

    res.json({
      text: result.text,
      localFallback: result.usedLocalFallback,
      model: selected ? { id: selected.id, label: selected.label, providerLabel: selected.providerLabel } : null,
    });
  } catch (error: any) {
    console.error("Nova API Error:", error);
    res.json({
      text: "I am observing your chemical workstation. Select an item or pour chemicals to perform your reaction!",
      model: null,
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  attachControlServer(httpServer);
}

startServer();
