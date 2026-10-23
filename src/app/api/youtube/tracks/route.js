import { NextResponse } from "next/server";
import { getYoutubeTracks, deleteYoutubeTrack } from "@/lib/dataStore";

export async function GET() {
  try {
    const tracks = await getYoutubeTracks();
    return NextResponse.json({ success: true, data: tracks });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load tracks" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Track ID is required" },
        { status: 400 }
      );
    }
    await deleteYoutubeTrack(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete track" },
      { status: 500 }
    );
  }
}
