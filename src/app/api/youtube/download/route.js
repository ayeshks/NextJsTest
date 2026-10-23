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
    const downloadPromise = ytdl.download(url, {
      filter: { hasAudio: true, hasVideo: false },
      quality: "highestaudio",
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Download stream timeout")), 6500)
    );

    const stream = await Promise.race([downloadPromise, timeoutPromise]);
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
    console.warn("YouTube download error/timeout, redirecting to cloud converter:", error.message);
    return Response.redirect(
      `https://cobalt.tools/?u=${encodeURIComponent(url)}`,
      307
    );
  }
}
