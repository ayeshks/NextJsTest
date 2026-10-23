import { Ytdl } from "@distube/ytdl-core";
import { NextResponse } from "next/server";
import { Readable } from "stream";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing YouTube URL", { status: 400 });
  }

  try {
    const ytdl = new Ytdl();
    const info = await ytdl.getInfo(url);
    const audioFormats =
      info.formats?.filter((f) => f.hasAudio && !f.hasVideo) || [];

    // If direct Google audio stream URL is available, redirect with 307 for instant seekable playback
    if (audioFormats.length > 0 && audioFormats[0].url) {
      return NextResponse.redirect(audioFormats[0].url, 307);
    }

    // Fallback: pipe stream with inline Content-Disposition
    const stream = await ytdl.download(url, {
      filter: { hasAudio: true, hasVideo: false },
      quality: "highestaudio",
    });

    const webStream = Readable.toWeb(stream);
    return new Response(webStream, {
      headers: {
        "Content-Type": "audio/mp4",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Audio stream route error:", error);
    return new Response(`Streaming error: ${error.message}`, { status: 500 });
  }
}
