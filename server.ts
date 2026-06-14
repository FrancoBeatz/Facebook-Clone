import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Google GenAI on the server
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json());

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiConfigured: !!apiKey });
});

// AI Content Assistant Endpoints
app.post("/api/gemini/ideas", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `Generate 4 highly-engaging social media post ideas (headline, text draft, suggested hashtags) based on this topic: "${topic}". Make them look professional, viral, and relatable.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              draft: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["headline", "draft", "hashtags"],
          },
        },
      },
    });

    const text = response.text || "[]";
    res.json({ ideas: JSON.parse(text) });
  } catch (error: any) {
    console.error("Gemini Ideas Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate ideas" });
  }
});

app.post("/api/gemini/improve", async (req, res) => {
  try {
    const { text, tone } = req.body; // tone: professional, witty, casual, energetic, poetic
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `Rewrite and improve the following draft text to sound extremely ${tone || "professional"}. Keep any key messages intact, optimize spacing, make it engaging and clean:\n\n"${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ improvedText: response.text });
  } catch (error: any) {
    console.error("Gemini Improve Error:", error);
    res.status(500).json({ error: error.message || "Failed to improve content" });
  }
});

app.post("/api/gemini/caption", async (req, res) => {
  try {
    const { context } = req.body;
    if (!context) {
      return res.status(400).json({ error: "Context is required" });
    }

    const prompt = `Based on this context/topic: "${context}", generate 3 engaging caption-hashtag combinations. One with high energy, one professional, and one short with high emotional hook.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["caption", "hashtags"],
          },
        },
      },
    });

    const text = response.text || "[]";
    res.json({ captions: JSON.parse(text) });
  } catch (error: any) {
    console.error("Gemini Caption Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate captions" });
  }
});

app.post("/api/gemini/assist", async (req, res) => {
  try {
    const { text, action, targetLanguage } = req.body; // action: summarize, translate, expand
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    let prompt = "";
    if (action === "summarize") {
      prompt = `Provide a concise, 1-2 sentence high-impact summary of this post text:\n\n"${text}"`;
    } else if (action === "expand") {
      prompt = `Expand this short post draft into a rich, structured, highly-engaging longer social media post with headers, formatted list items if applicable, and deep context:\n\n"${text}"`;
    } else if (action === "translate") {
      prompt = `Translate the following text into ${targetLanguage || "Spanish"}, maintaining the casual/professional tone of the original social media post:\n\n"${text}"`;
    } else {
      prompt = `Format or improve this text:\n\n"${text}"`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("Gemini Assist Error:", error);
    res.status(500).json({ error: error.message || "Failed to complete assistance task" });
  }
});

// AI Feed Ranking Algorithm
app.post("/api/gemini/rank", async (req, res) => {
  try {
    const { posts, preferences } = req.body;
    // preferences looks like: { likedCategories: ["tech", "music"], likedAuthors: ["bob", "alice"], commentKeywords: [...] }
    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ error: "Posts list array is required" });
    }

    const prompt = `You are a social network feed algorithm ranking post content for a user.
Their interaction profile and preferences are:
${JSON.stringify(preferences || {})}

Rank the following posts in order of interest to this user, highest interest first.
Return an array of the post IDs in ranked sequence.

Posts to rank:
${JSON.stringify(posts.map(p => ({ id: p.postId, content: p.content, author: p.authorName })))}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const text = response.text || "[]";
    const orderedIds = JSON.parse(text);
    res.json({ orderedIds });
  } catch (error: any) {
    console.error("Gemini Rank Error:", error);
    res.status(500).json({ error: error.message || "Failed to rank feed posts" });
  }
});

// Setup Vite Dev server or Serve build assets
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
