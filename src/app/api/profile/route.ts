import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { updateUserProfile } from "@/server/auth/users";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = (await request.json()) as { firstName?: unknown; country?: unknown; whatsapp?: unknown };
  if (body.firstName !== undefined && typeof body.firstName !== "string")
    return NextResponse.json({ error: "Invalid name." }, { status: 400 });
  if (body.country !== undefined && typeof body.country !== "string")
    return NextResponse.json({ error: "Invalid country." }, { status: 400 });
  if (body.whatsapp !== undefined && typeof body.whatsapp !== "string")
    return NextResponse.json({ error: "Invalid WhatsApp number." }, { status: 400 });
  if (
    typeof body.whatsapp === "string" &&
    body.whatsapp.trim().length > 0 &&
    !/^[0-9+\s()-]{6,25}$/.test(body.whatsapp.trim())
  )
    return NextResponse.json({ error: "Invalid WhatsApp number format." }, { status: 400 });

  const updatedUser = await updateUserProfile(user.id, {
    firstName: body.firstName as string | undefined,
    country: body.country as string | undefined,
    whatsapp: body.whatsapp as string | undefined,
  });
  if (!updatedUser) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({
    user: {
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      country: updatedUser.country,
      whatsapp: updatedUser.whatsapp,
    },
  });
}
