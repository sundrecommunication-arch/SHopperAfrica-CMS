import { NextResponse } from "next/server";
import { searchWorldwide } from "@/modules/dropship/global/global-service";
import { worldwideError, worldwideStore } from "../_shared";

export async function GET(request: Request) {
  try {
    const store = await worldwideStore();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    return NextResponse.json(await searchWorldwide(searchParams.get("q") ?? "", page, store.id));
  } catch (error) {
    return worldwideError(error);
  }
}
