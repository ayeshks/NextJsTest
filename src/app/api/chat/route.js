import { NextResponse } from "next/server";
import { getChatMessages, addChatMessage } from "@/lib/dataStore";

export async function GET() {
  try {
    const messages = await getChatMessages();
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, sender, accountId } = body;

    if (!text || (!sender && !accountId)) {
      return NextResponse.json(
        { success: false, error: "Message text and sender are required" },
        { status: 400 }
      );
    }

    const newMessage = await addChatMessage({ sender, text, accountId });
    return NextResponse.json({ success: true, data: newMessage });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to save message" },
      { status: 500 }
    );
  }
}
