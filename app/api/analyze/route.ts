import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialise Groq client server-side only (key is never exposed to the browser)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ALLOWED_CATEGORIES = [
  "Food & Beverage",
  "Transport",
  "Groceries",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Miscellaneous",
] as const;

// ── Model selection ────────────────────────────────────────────────────────────
// llama-3.2-11b-vision-preview was DECOMMISSIONED by Groq (model_decommissioned).
// qwen/qwen3.8-27b is confirmed as the only active vision model on this key
// (verified via GET /openai/v1/models — input_modalities includes "image").
const VISION_MODEL = "qwen/qwen3.8-27b";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, amount } = body as { image: string; amount: number };

    if (!image) {
      return NextResponse.json(
        { error: "Missing required field: image" },
        { status: 400 }
      );
    }

    // The image arrives as a base64 data-URL (data:image/jpeg;base64,...)
    // Strip the prefix — Groq Vision wants the full data-URL in the url field.
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
    const mimeType =
      (mimeMatch?.[1] as
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "image/gif") ?? "image/jpeg";

    // Reconstruct a clean data-URL (handles cases where prefix was already stripped)
    const base64Data = image.startsWith("data:")
      ? image.split(",")[1]
      : image;
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image representing a transaction context for an amount of ${
                amount ?? "unknown"
              }. Classify this into exactly ONE of these categories: Food & Beverage, Transport, Groceries, Shopping, Utilities, Entertainment, or Miscellaneous. Return ONLY the category name as a plain string, nothing else.`,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      // Keep the response short — we only want the category name
      max_tokens: 20,
      temperature: 0,
    });

    const rawResponse =
      completion.choices[0]?.message?.content?.trim() ?? "";

    // Validate the model returned one of our allowed categories
    const matched = ALLOWED_CATEGORIES.find((cat) =>
      rawResponse.toLowerCase().includes(cat.toLowerCase())
    );

    const category = matched ?? "Miscellaneous";

    return NextResponse.json({ category });
  } catch (err: unknown) {
    console.error("[/api/analyze] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
