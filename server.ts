import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { routeChat, getAvailableModels, getModel } from "./server/aiRouter";

dotenv.config();

const app = express();
// Render / Railway / Fly inject PORT — fall back to 3000 for local dev.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API routes
app.get("/api/nova/models", (_req, res) => {
  res.json({ models: getAvailableModels() });
});

app.post("/api/nova/chat", async (req, res) => {
  const { message, experiment, model, language } = req.body || {};
  try {
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
      text:
        experiment === "Solar System Academy"
          ? "I am gazing at the planets with you. Ask me about any planet, orbit, or the Sun, and I will teach you!"
          : "I am observing your chemical workstation. Select an item or pour chemicals to perform your reaction!",
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
