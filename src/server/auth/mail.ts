import { getAppUrl } from "@/lib/env";

const appUrl = getAppUrl();

// Resend returns the useful part (e.g. an unverified sender domain) in the body, not the status.
async function resendFailure(response: Response) {
  const detail = await response.text().catch(() => "");
  return new Error(
    `Resend request failed with status ${response.status}${detail ? `: ${detail.slice(0, 300)}` : "."}`,
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendVerificationEmail(input: {
  email: string;
  firstName?: string;
  token: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required.");

  const verificationUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(input.token)}`;
  const greeting = input.firstName ? `Hi ${escapeHtml(input.firstName)},` : "Hi there,";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Verify your CeylonHosting email",
      html: `<p>${greeting}</p><p>Verify your CeylonHosting account by clicking the link below:</p><p><a href="${verificationUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw await resendFailure(response);
}

export async function sendPasswordResetEmail(input: {
  email: string;
  firstName?: string;
  token: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required.");

  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = input.firstName ? `Hi ${escapeHtml(input.firstName)},` : "Hi there,";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Reset your CeylonHosting password",
      html: `<p>${greeting}</p><p>Reset your CeylonHosting password using the link below:</p><p><a href="${resetUrl}">Reset my password</a></p><p>This link expires in 1 hour.</p>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw await resendFailure(response);
}

export async function sendServerRenewalReminderEmail(input: {
  email: string;
  customerName?: string;
  serverName: string;
  daysRemaining: number;
  expirationDate: string;
  monthlyPrice: number;
  renewalUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required.");

  const greeting = input.customerName ? `Hi ${escapeHtml(input.customerName)},` : "Hi there,";
  const safeServerName = escapeHtml(input.serverName);
  const formattedPrice = `Rs. ${input.monthlyPrice.toLocaleString("en-LK")}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; color: #171717; margin: 0; padding: 24px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; }
    .header { background: #171717; color: #ffffff; padding: 24px; text-align: left; }
    .header .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #a3a3a3; }
    .header h1 { font-size: 20px; margin: 8px 0 0 0; color: #ffffff; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .badge { display: inline-block; background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 16px; }
    .details-box { background: #fafafa; border: 1px solid #eaeaea; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #737373; }
    .details-val { font-weight: 600; color: #171717; text-align: right; }
    .btn-wrap { text-align: center; margin: 28px 0 16px 0; }
    .btn { display: inline-block; background: #171717; color: #ffffff !important; padding: 13px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; }
    .footer { border-top: 1px solid #eeeeee; padding: 18px 24px; font-size: 11px; color: #8a8a8a; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">CeylonHosting / Server Operations</div>
      <h1>Monthly Server Renewal Notice</h1>
    </div>
    <div class="content">
      <span class="badge">Day 25 Reminder &bull; ${input.daysRemaining} Days Remaining</span>
      <p>${greeting}</p>
      <p>This is a reminder that your monthly subscription for <strong>${safeServerName}</strong> will reach the end of its billing cycle on <strong>${escapeHtml(input.expirationDate)}</strong>.</p>
      
      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Server Product:</span>
          <span class="details-val">${safeServerName}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Billing Cycle:</span>
          <span class="details-val">Monthly</span>
        </div>
        <div class="details-row">
          <span class="details-label">Renewal Due Date:</span>
          <span class="details-val">${escapeHtml(input.expirationDate)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Days Left:</span>
          <span class="details-val">${input.daysRemaining} days</span>
        </div>
        <div class="details-row">
          <span class="details-label">Renewal Amount:</span>
          <span class="details-val">${formattedPrice}</span>
        </div>
      </div>

      <p>To avoid any interruption to your community or server downtime, please make your renewal payment before the expiration date.</p>

      <div class="btn-wrap">
        <a class="btn" href="${escapeHtml(input.renewalUrl)}" target="_blank">Renew Server Now &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #737373; margin-top: 24px;">
        If you no longer need this server, you can ignore this email and the server will expire automatically at the end of the 30-day period.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} CeylonHosting. Game servers and community solutions.
    </div>
  </div>
</body>
</html>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: `Action Required: Renew your ${input.serverName} server (${input.daysRemaining} days remaining)`,
      html,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw await resendFailure(response);
}
