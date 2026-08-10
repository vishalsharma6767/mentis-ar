import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Shared Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API routes
app.post("/api/nova/chat", async (req, res) => {
  try {
    const { message, experiment } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ text: `Nova AI is ready in your lab! You asked: "${message || 'Hello'}". Perform your experiment step by step!` });
    }

    const systemInstruction = `You are Nova, an expert AI Lab Assistant in a 3D Virtual Chemistry Lab. 
    Your goal is to guide students through experiments safely and educationally.
    Current experiment: ${experiment || 'None selected'}.
    Keep your responses encouraging, clear, and concise (1-2 sentences maximum).
    IMPORTANT: Output plain spoken English text only. Do NOT use markdown symbols like hashtags (#), asterisks (*), underscores (_), dollar signs ($), or bullet lists, because your output will be read aloud by speech synthesis.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: message || "Hello Nova",
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text || "I am right here with you in the lab. Select chemicals to perform your reaction!" });
  } catch (error: any) {
    console.error("Nova API Error:", error);
    res.json({ text: "I am observing your chemical workstation. Select an item or pour chemicals to perform your reaction!" });
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
