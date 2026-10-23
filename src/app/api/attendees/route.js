import { NextResponse } from "next/server";
import { getAttendees, addAttendee, deleteAttendee } from "@/lib/dataStore";

export async function GET() {
  try {
    const attendees = await getAttendees();
    return NextResponse.json({ success: true, data: attendees });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendees" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Attendee name is required" },
        { status: 400 }
      );
    }
    const newAttendee = await addAttendee(body);
    return NextResponse.json({ success: true, data: newAttendee });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to add attendee" },
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
        { success: false, error: "Attendee id is required" },
        { status: 400 }
      );
    }
    await deleteAttendee(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete attendee" },
      { status: 500 }
    );
  }
}
