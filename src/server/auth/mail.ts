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

export async function sendOrderPaidAdminNotificationEmail(input: {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  customerCountry?: string;
  paymentId: string;
  amountCents: number;
  items: Array<{
    name: string;
    type: string;
    quantity: number;
    unitPrice: number;
  }>;
  paidAt?: Date;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn("Skipping admin order notification email: RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.");
    return;
  }

  const to = process.env.ORDER_NOTIFICATION_EMAIL || "ceylonhosting@proton.me";
  const orderUrl = `${appUrl}/admin/orders/${encodeURIComponent(input.orderId)}`;
  const totalFormatted = `Rs. ${(input.amountCents / 100).toLocaleString("en-LK")}`;
  const safeOrderId = escapeHtml(input.orderId);
  const safeCustomerEmail = escapeHtml(input.customerEmail);
  const safePaymentId = escapeHtml(input.paymentId);
  const customerDisplay = input.customerName
    ? `${escapeHtml(input.customerName)} (${safeCustomerEmail})${input.customerCountry ? ` &bull; ${escapeHtml(input.customerCountry)}` : ""}`
    : safeCustomerEmail;

  const formattedDate = (input.paidAt ?? new Date()).toLocaleString("en-US", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const itemsRows = input.items
    .map((item) => {
      const safeName = escapeHtml(item.name);
      const safeType = escapeHtml(
        item.type === "server"
          ? "Game Server"
          : item.type === "service"
            ? "Setup Service"
            : "Mod / Tool",
      );
      const itemTotal = `Rs. ${(item.unitPrice * item.quantity).toLocaleString("en-LK")}`;
      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <strong style="color: #171717;">${safeName}</strong>
            <span style="display: block; font-size: 11px; color: #737373;">${safeType}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: center; vertical-align: top; color: #525252;">${item.quantity}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right; vertical-align: top; font-weight: 600; color: #171717;">${itemTotal}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; color: #171717; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; }
    .header { background: #171717; color: #ffffff; padding: 24px; text-align: left; }
    .header .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #a3a3a3; }
    .header h1 { font-size: 20px; margin: 8px 0 0 0; color: #ffffff; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 16px; }
    .details-box { background: #fafafa; border: 1px solid #eaeaea; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #737373; }
    .details-val { font-weight: 600; color: #171717; text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .items-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #737373; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
    .btn-wrap { text-align: center; margin: 28px 0 16px 0; }
    .btn { display: inline-block; background: #171717; color: #ffffff !important; padding: 13px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; }
    .footer { border-top: 1px solid #eeeeee; padding: 18px 24px; font-size: 11px; color: #8a8a8a; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">CeylonHosting &bull; Admin Notification</div>
      <h1>New Payment Completed</h1>
    </div>
    <div class="content">
      <span class="badge">Payment Confirmed &bull; ${totalFormatted}</span>
      <p>A new order payment has been successfully completed on CeylonHosting.</p>
      
      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Order ID:</span>
          <span class="details-val">${safeOrderId}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Customer:</span>
          <span class="details-val">${customerDisplay}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Payment ID:</span>
          <span class="details-val">${safePaymentId}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Total Amount:</span>
          <span class="details-val">${totalFormatted}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Date:</span>
          <span class="details-val">${formattedDate}</span>
        </div>
      </div>

      <h3 style="font-size: 14px; margin: 20px 0 6px 0; color: #171717;">Purchased Items</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="btn-wrap">
        <a class="btn" href="${escapeHtml(orderUrl)}" target="_blank">Open Order in Admin Dashboard &rarr;</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} CeylonHosting Admin Notification System.
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
      to: [to],
      subject: `New Paid Order: ${input.orderId} (${totalFormatted})`,
      html,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw await resendFailure(response);
}
