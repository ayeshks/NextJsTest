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

    const ytdl = new Ytdl();
    const info = await ytdl.getInfo(trimmedUrl);

    if (!info || !info.videoDetails) {
      return NextResponse.json(
        { success: false, error: "Could not retrieve video information." },
        { status: 404 }
      );
    }

    const details = info.videoDetails;
    const durationSec = parseInt(details.lengthSeconds || "0", 10);
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    const durationFormatted = `${m}:${String(s).padStart(2, "0")}`;

    const thumbnail =
      details.thumbnails && details.thumbnails.length > 0
        ? details.thumbnails[details.thumbnails.length - 1].url
        : `https://i.ytimg.com/vi/${details.videoId}/hqdefault.jpg`;

    // Audio format info
    const audioFormats = info.formats?.filter(
      (f) => f.hasAudio && !f.hasVideo
    ) || [];
    const highestBitrate = audioFormats.reduce(
      (max, f) => (f.audioBitrate > max ? f.audioBitrate : max),
      128
    );

    // Save into party track library in youtube_tracks.json
    const saved = await saveYoutubeTrack({
      videoId: details.videoId,
      title: details.title,
      artist: details.author?.name || "YouTube Audio",
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
        viewCount: details.viewCount,
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
