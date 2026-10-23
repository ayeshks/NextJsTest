import { NextResponse } from "next/server";
import { getAccounts, saveAccount } from "@/lib/dataStore";

export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name && !body.alias) {
      return NextResponse.json(
        { success: false, error: "Name or alias is required" },
        { status: 400 }
      );
    }
    const account = await saveAccount(body);
    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to save account" },
      { status: 500 }
    );
  }
}
