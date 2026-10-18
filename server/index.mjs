import { createServer } from "node:http";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenAI } from "@google/genai";
import { createChatHandler } from "./chat-handler.mjs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY must be set on the server");
if (!getApps().length) initializeApp({ credential: applicationDefault() });
const ai = new GoogleGenAI({ apiKey });

const systemInstruction = `You are an assistant for a fictional dental clinic demo.
Give only general clinic information, not diagnoses or medical recommendations.
Services: cleaning, consultation, whitening, orthodontics and pediatric dentistry.
Demo hours: Monday–Saturday, 9 AM–6 PM. Demo location: Geneva.
Never claim an appointment was booked, a lead was delivered, a reminder was
sent, or clinic staff will contact someone unless the action was verified.
Never ask for health details. For urgent medical concerns, tell the user to
contact a qualified local professional or emergency service. Be concise.`;

const handler = createChatHandler({
  verifyIdToken: token => getAuth().verifyIdToken(token, true),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ||
    "http://localhost:3000,http://127.0.0.1:3000")
    .split(",").map(s => s.trim()).filter(Boolean),
  generateReply: async ({ message, history }) => {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: { systemInstruction, maxOutputTokens: 512 },
    });
    return response.text || "";
  },
});

const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("Invalid PORT");
createServer(handler).listen(port, "127.0.0.1", () => {
  console.log(`Dentivo demo API listening on 127.0.0.1:${port}`);
});
