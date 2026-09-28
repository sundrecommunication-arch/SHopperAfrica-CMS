import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendContactMessage } from "@/lib/email";

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in every field correctly." }, { status: 400 });
  }

  try {
    await sendContactMessage(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send contact message:", error);
    return NextResponse.json(
      { error: "We couldn't send your message right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
