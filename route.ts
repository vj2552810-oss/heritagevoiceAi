import { NextResponse } from "next/server";
import { db } from "@/db";
import { dialectWords, folkStories, heritageArchive } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import {
  analyzeVoiceOrText,
  performGroundedSearch,
  translateCulturalContent,
} from "@/lib/ai";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeeded();

    const contentType = req.headers.get("content-type") || "";

    // Handle multipart/form-data for live audio upload + speech-to-text pipeline
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;
      const transcript = (formData.get("transcript") as string) || "";
      const presetKey = (formData.get("presetKey") as string) || "";
      const region = (formData.get("region") as string) || "Konkan & Sahyadri";
      const dialect =
        (formData.get("dialect") as string) || "Malvani / Konkani";

      let audioBuffer: Buffer | undefined;
      let filename = "recording.webm";

      if (audioFile && audioFile.size > 0) {
        const arrayBuffer = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
        filename = audioFile.name || "recording.webm";
      }

      const result = await analyzeVoiceOrText({
        transcript,
        presetKey,
        region,
        dialect,
        audioBuffer,
        filename,
      });

      return NextResponse.json({ ok: true, result });
    }

    // Handle JSON requests
    const body = await req.json();
    const { operation } = body;

    if (operation === "voice-pipeline" || operation === "story-analyze") {
      const result = await analyzeVoiceOrText({
        transcript: body.transcript || body.originalText || "",
        presetKey: body.presetKey || "",
        region: body.region || "Konkan & Sahyadri",
        dialect: body.dialect || "Regional Dialect",
      });
      return NextResponse.json({ ok: true, result });
    }

    if (operation === "translate") {
      const { text, sourceLanguage, region } = body;
      if (!text || !String(text).trim()) {
        return NextResponse.json(
          { error: "Please provide text to translate." },
          { status: 400 }
        );
      }

      const result = await translateCulturalContent({
        text: String(text),
        sourceLanguage: sourceLanguage || "Local Dialect",
        region: region || "Konkan & Karnataka",
      });

      return NextResponse.json({ ok: true, result });
    }

    if (operation === "semantic-search") {
      const { query } = body;
      if (!query || !String(query).trim()) {
        return NextResponse.json(
          { error: "Please enter a search question." },
          { status: 400 }
        );
      }

      const [approvedWords, approvedStories, approvedHeritage] =
        await Promise.all([
          db
            .select()
            .from(dialectWords)
            .where(eq(dialectWords.status, "approved")),
          db
            .select()
            .from(folkStories)
            .where(eq(folkStories.status, "approved")),
          db
            .select()
            .from(heritageArchive)
            .where(eq(heritageArchive.status, "approved")),
        ]);

      const searchResult = await performGroundedSearch(
        String(query),
        approvedWords,
        approvedStories,
        approvedHeritage
      );

      return NextResponse.json({ ok: true, result: searchResult });
    }

    return NextResponse.json(
      { error: "Unsupported AI operation." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/ai error:", error);
    return NextResponse.json(
      { error: "AI processing error occurred." },
      { status: 500 }
    );
  }
}
