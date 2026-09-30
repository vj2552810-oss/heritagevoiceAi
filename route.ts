import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaFiles } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_AUDIO_MIME = [
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "video/webm", // MediaRecorder in some browsers tags audio-only webm as video/webm
];

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { error: "Media ID is required." },
        { status: 400 }
      );
    }

    const [record] = await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.id, id))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "Media file not found." },
        { status: 404 }
      );
    }

    const commaIndex = record.dataUrl.indexOf(",");
    const base64Payload =
      commaIndex !== -1 ? record.dataUrl.slice(commaIndex + 1) : record.dataUrl;
    const binaryBuffer = Buffer.from(base64Payload, "base64");

    return new Response(binaryBuffer, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(binaryBuffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET /api/upload error:", error);
    return NextResponse.json(
      { error: "Failed to load media file." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mediaType = (formData.get("mediaType") as string) || "auto";

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file uploaded or file is empty." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed size of 10MB." },
        { status: 400 }
      );
    }

    const mime = file.type.toLowerCase();
    const isImage =
      ALLOWED_IMAGE_MIME.some((m) => mime.includes(m)) ||
      mediaType === "image";
    const isAudio =
      ALLOWED_AUDIO_MIME.some((m) => mime.includes(m)) ||
      mediaType === "audio";

    if (!isImage && !isAudio) {
      return NextResponse.json(
        {
          error: `Unsupported file format (${
            mime || "unknown"
          }). Please upload a valid audio or image file.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeMime = isImage
      ? mime || "image/jpeg"
      : mime.includes("video/webm")
      ? "audio/webm"
      : mime || "audio/webm";

    const dataUrl = `data:${safeMime};base64,${buffer.toString("base64")}`;

    let insertedId: number | null = null;
    try {
      const [created] = await db
        .insert(mediaFiles)
        .values({
          filename: file.name || `upload-${Date.now()}`,
          mimeType: safeMime,
          size: file.size,
          dataUrl,
        })
        .returning();
      if (created) insertedId = created.id;
    } catch (dbErr) {
      console.error("Database media persistence fallback:", dbErr);
    }

    return NextResponse.json({
      ok: true,
      id: insertedId,
      url: dataUrl,
      filePath: insertedId ? `/api/upload?id=${insertedId}` : dataUrl,
      size: file.size,
      mime: safeMime,
    });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload media file." },
      { status: 500 }
    );
  }
}
