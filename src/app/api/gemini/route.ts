import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  language: z.string().trim().min(2).max(40),
  orderId: z.string().min(5).max(30),
});

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "Gemini Lite is not configured. The demo provider remains available." },
      { status: 503 }
    );
  }

  try {
    const parsed = requestSchema.parse(await request.json());
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction =
      "You are RouteSaathi, a calm, action-oriented Indian delivery operations assistant. " +
      "Reply in the rider's selected language or natural code-switching. Keep responses to two short spoken sentences. " +
      "Do not invent orders or policies. Before rescheduling, address changes, or neighbour handoff, confirm important details.";

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_LITE_MODEL || "gemini-2.5-flash-lite",
      contents: `Order ${parsed.orderId}. Rider input: ${parsed.text}. Selected language: ${parsed.language}.`,
      config: { systemInstruction },
    });

    return NextResponse.json({ ok: true, text: response.text || "Main samajh gaya. Kya aap confirm karna chahenge?" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Gemini Lite request failed" },
      { status: 400 }
    );
  }
}
