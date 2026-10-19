import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/server/auth/users";
import { sendVerificationEmail } from "@/server/auth/mail";
import { enforceRateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "sign-up", { limit: 5, windowMs: 10 * 60_000 });
  if (limited) return limited;

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    firstName?: string;
    country?: string;
    whatsapp?: string;
    acceptedTerms?: boolean;
  };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const whatsapp = body.whatsapp?.trim();
  if (!email || !email.includes("@") || password.length < 8 || body.acceptedTerms !== true) {
    return NextResponse.json(
      { error: "Use a valid email and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  if (!whatsapp || whatsapp.length < 6 || whatsapp.length > 25 || !/^[0-9+\s()-]{6,25}$/.test(whatsapp)) {
    return NextResponse.json(
      { error: "Please provide a valid WhatsApp number." },
      { status: 400 },
    );
  }

  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  try {
    const { user, verificationToken } = await createUser({
      email,
      password,
      firstName: body.firstName,
      country: body.country,
      whatsapp,
    });
    // The account already exists at this point, so a mail outage must not fail the request.
    let emailSent = true;
    try {
      await sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        token: verificationToken,
      });
    } catch (error) {
      emailSent = false;
      console.error("Unable to send verification email", error);
    }
    return NextResponse.json(
      {
        message: emailSent
          ? "Check your email to verify your account."
          : "Your account was created, but we could not send the verification email. Use the resend option to try again.",
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create account", error);
    return NextResponse.json(
      { error: "We could not create your account right now." },
      { status: 500 },
    );
  }
}
