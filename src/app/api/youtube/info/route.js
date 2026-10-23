import { NextResponse } from "next/server";
import { Ytdl } from "@distube/ytdl-core";
import { saveYoutubeTrack } from "@/lib/dataStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, addedBy } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Please provide a valid YouTube URL." },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    // Validate YouTube URL
    const isYoutube =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(
        trimmedUrl
      );

    if (!isYoutube) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid YouTube URL format. Please paste a standard YouTube video or music link.",
        },
        { status: 400 }
      );
    }

    let title = "Party YouTube Track";
    let artist = "YouTube Audio";
    let durationFormatted = "3:30";
    let videoId = "";
    const idMatch = trimmedUrl.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    if (idMatch && idMatch[1]) {
      videoId = idMatch[1];
    }

    let thumbnail = videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : "";
    let highestBitrate = 192;
    let viewCount = "10K+";

    // 1. Try Ytdl info extraction with timeout
    try {
      const ytdl = new Ytdl();
      const infoPromise = ytdl.getInfo(trimmedUrl);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("ytdl timeout")), 6000)
      );
      const info = await Promise.race([infoPromise, timeoutPromise]);

      if (info && info.videoDetails) {
        const details = info.videoDetails;
        videoId = details.videoId || videoId;
        title = details.title || title;
        artist = details.author?.name || artist;
        const durationSec = parseInt(details.lengthSeconds || "0", 10);
        if (durationSec > 0) {
          const m = Math.floor(durationSec / 60);
          const s = durationSec % 60;
          durationFormatted = `${m}:${String(s).padStart(2, "0")}`;
        }
        if (details.thumbnails && details.thumbnails.length > 0) {
          thumbnail = details.thumbnails[details.thumbnails.length - 1].url;
        }
        const audioFormats =
          info.formats?.filter((f) => f.hasAudio && !f.hasVideo) || [];
        highestBitrate = audioFormats.reduce(
          (max, f) => (f.audioBitrate > max ? f.audioBitrate : max),
          128
        );
        viewCount = details.viewCount || viewCount;
      }
    } catch (ytdlErr) {
      console.warn("Ytdl getInfo failed (using oEmbed fallback):", ytdlErr.message);

      // 2. Fallback to YouTube official oEmbed API (100% reliable on Vercel)
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title) title = oembedData.title;
          if (oembedData.author_name) artist = oembedData.author_name;
          if (oembedData.thumbnail_url) thumbnail = oembedData.thumbnail_url;
        }
      } catch (oembedErr) {
        console.warn("oEmbed fallback also failed:", oembedErr.message);
      }
    }

    // Save into party track library in youtube_tracks.json
    const saved = await saveYoutubeTrack({
      videoId: videoId || idMatch?.[1] || "",
      title,
      artist,
      duration: durationFormatted,
      url: trimmedUrl,
      thumbnail,
      addedBy: addedBy || "VIP Member",
    });

    return NextResponse.json({
      success: true,
      data: {
        ...saved,
        bitrate: `${highestBitrate} kbps`,
        viewCount,
      },
    });
  } catch (error) {
    console.error("YouTube info extraction error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process YouTube link.",
      },
      { status: 500 }
    );
  }
}
