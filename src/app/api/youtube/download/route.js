import { Ytdl } from "@distube/ytdl-core";
import { Readable } from "stream";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const rawTitle = searchParams.get("title") || "Party_Track";

  if (!url) {
    return new Response("Missing YouTube URL parameter", { status: 400 });
  }

  try {
    const ytdl = new Ytdl();
    const stream = await ytdl.download(url, {
      filter: { hasAudio: true, hasVideo: false },
      quality: "highestaudio",
    });

    const webStream = Readable.toWeb(stream);

    const safeTitle = encodeURIComponent(
      rawTitle.replace(/[^a-zA-Z0-9\s_-]/g, "").trim().replace(/\s+/g, "_").substring(0, 80)
    ) || "party_song";

    return new Response(webStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${safeTitle}.mp3"; filename*=UTF-8''${safeTitle}.mp3`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("YouTube download streaming error:", error);
    return new Response(`Failed to download audio: ${error.message}`, {
      status: 500,
    });
  }
}
