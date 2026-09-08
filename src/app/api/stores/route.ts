import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStoreForUser, StoreServiceError } from "@/modules/stores/services/store-service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const store = await createStoreForUser(session.user.id, body);
    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    if (error instanceof StoreServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("store creation failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
