/**
 * email.ts
 *
 * Brevo (Sendinblue) transactional email client via HTTP.
 * Replaces the @getbrevo/brevo SDK (which uses Node.js APIs).
 */

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

export interface PaymentDetails {
  name: string;
  email: string;
  amount: number;
  currency: string;
  items: {
    itemType: "COURSE" | "BUNDLE";
    itemId: string;
    name: string;
    slug: string;
  }[];
  orderId: string;
  purchaseDate: string;
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export async function sendPaymentConfirmation(
  data: PaymentDetails,
  brevoApiKey: string
): Promise<void> {
  const { name, email, amount, currency, items, orderId, purchaseDate } = data;
  const formattedDate = formatDateTime(purchaseDate);

  const itemLinks = items
    .map((item) => {
      const link = `https://redpandalearns.ai/${item.itemType.toLowerCase()}s/${item.slug}`;
      return `<p style="margin:6px 0; font-size:15px;">
        <strong>${item.name}:</strong><br>
        <a href="${link}" style="color:#d32f2f; text-decoration:none;">${link}</a>
      </p>`;
    })
    .join("");

  const htmlContent = `
<div style="font-family:Arial,sans-serif;background:#f2f2f2;padding:16px;">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.08);overflow:hidden;">
  <div style="padding:18px 10px;text-align:center;">
    <img src="https://redpandalearns.ai/logo.png" alt="RedPanda Learns" style="max-width:150px;height:auto;display:block;margin:auto;">
  </div>
  <div style="padding:20px;">
    <p style="font-size:16px;">Dear ${name},</p>
    <p style="font-size:15px;">Thank you for your purchase. Your payment has been successfully processed.</p>
    <h3 style="color:#0f4396;">Order Summary</h3>
    <div style="background:#fafafa;padding:14px;border-radius:10px;border:1px solid #eee;">
      <table style="width:100%;font-size:15px;border-collapse:collapse;">
        <tr><td style="padding:6px;font-weight:bold;">Order ID</td><td>#${orderId}</td></tr>
        <tr><td style="padding:6px;font-weight:bold;">Date</td><td>${formattedDate}</td></tr>
        <tr><td style="padding:6px;font-weight:bold;">Amount</td><td>${currency} ${amount}</td></tr>
        <tr>
          <td style="padding:6px;font-weight:bold;vertical-align:top;">Items</td>
          <td><ul style="margin:0;padding-left:18px;">${items.map((i) => `<li>${i.name}</li>`).join("")}</ul></td>
        </tr>
      </table>
    </div>
    <h3 style="color:#0f4396;">Access Your Learning</h3>
    ${itemLinks}
    <p style="font-size:15px;">
      <strong>Dashboard:</strong><br>
      <a href="https://redpandalearns.ai/dashboard" style="color:#0f4396;">https://redpandalearns.ai/dashboard</a>
    </p>
    <p style="font-size:15px;">
      <strong>Invoice:</strong><br>
      <a href="https://redpandalearns.ai/invoices/${orderId}" style="color:#0f4396;">https://redpandalearns.ai/invoices/${orderId}</a>
    </p>
    <p style="font-size:13px;color:#777;">This is a no-reply email.</p>
    <p style="font-size:15px;">Best regards,<br><strong style="color:#0f4396;">Team RedPanda Learns</strong></p>
  </div>
</div>
</div>`;

  const resp = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "RedPanda Learns", email: "no_reply@redpandalearns.com" },
      to: [{ email }],
      bcc: [
        { email: "thesreedath@gmail.com" },
        { email: "raj.dandekar8@gmail.com" },
      ],
      subject: `[Team RedPanda Learns] Payment Confirmation - Order #${orderId}`,
      htmlContent,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Brevo sendPaymentConfirmation failed:", resp.status, text);
  }
}

export async function sendPaymentFailedEmail(
  opts: { email: string; name: string },
  brevoApiKey: string
): Promise<void> {
  const resp = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "RedPanda Learns", email: "no_reply@redpandalearns.com" },
      to: [{ email: opts.email }],
      bcc: [{ email: "thesreedath@gmail.com" }],
      subject: "[Team RedPanda Learns] Payment Failed",
      htmlContent: `
        <p>Dear ${opts.name},</p>
        <p>We're sorry, but your recent payment could not be processed.</p>
        <p>Please check your payment details or try again later.</p>
        <p>Best regards,<br>Team RedPanda Learns</p>
      `,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Brevo sendPaymentFailedEmail failed:", resp.status, text);
  }
}
