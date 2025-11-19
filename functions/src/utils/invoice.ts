import * as brevo from "@getbrevo/brevo";
import { logger } from "firebase-functions";
import { TransactionLineItem } from "../types/transaction";

export type PaymentDetails = {
  name: string;
  email: string,
  amount: number,
  currency: string,
  items: TransactionLineItem[],
  orderId: string;
  purchaseDate: string;
};

export const sendPaymentConfirmation = async (data: PaymentDetails, brevoApiKey: string) => {
  const { name, email, amount, currency, items, orderId, purchaseDate } = data;
  try {
    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

    const formattedPurchaseDate = (new Date(purchaseDate)).toLocaleDateString();

    // --- Prepare and send email via Brevo ---
    const sendSmtpEmail = {
      sender: { name: "Vizuara", email: "no_reply@vizuara.com" },
      to: [{ email }],
      bcc: [{ email: "thesreedath@gmail.com" }, { email: "raj.dandekar8@gmail.com" }, { email: "rajatdandekar@gmail.com" }],
      subject: `[Team Vizuara] Payment Confirmation - Order #${orderId}`,
      htmlContent: `
    <div style="font-family: Arial, sans-serif; background:#f2f2f2; padding:16px;">

    <!-- Outer Container -->
    <div style="max-width:560px; width:100 percent; margin:auto; background:#ffffff; border-radius:14px; box-shadow:0 4px 18px rgba(0,0,0,0.08); overflow:hidden;">

      <!-- Header -->
      <div style="padding:18px 10px; text-align:center;">
        <img src="https://vizuara.ai/logo.png" alt="Team Vizuara" style="max-width:150px; width:100 percent; height:auto; display:block; margin:auto;">
      </div>

      <!-- Body -->
      <div style="padding:20px;">

        <p style="margin:0 0 12px 0; font-size:16px; line-height:1.4;">Dear ${name},</p>

        <p style="margin:0 0 18px 0; font-size:15px; line-height:1.45;">
          Thank you for your purchase. Your payment has been successfully processed and your access is now active.
        </p>

        <!-- Section Title -->
        <h3 style="margin:0 0 12px 0; font-size:17px; color:#b71c1c; font-weight:600;">
          Order Summary
        </h3>

        <!-- Summary Card -->
        <div style="background:#fafafa; padding:14px; border-radius:10px; border:1px solid #eee;">

          <table style="width:100 percent; border-collapse:collapse; font-size:15px;">
            <tr>
              <td style="padding:6px 0; font-weight:bold; width:40 percent;">Order ID</td>
              <td style="padding:6px 0;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-weight:bold;">Purchase Date</td>
              <td style="padding:6px 0;">${formattedPurchaseDate}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-weight:bold;">Amount Paid</td>
              <td style="padding:6px 0;">${currency}${amount}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-weight:bold; vertical-align:top;">Items</td>
              <td style="padding:6px 0;">
                <ul style="margin:0; padding-left:18px;">
                  ${items.map(item => `<li style="margin:0; padding:0;">${item.name}</li>`).join('')}
                </ul>
              </td>
            </tr>
          </table>

        </div>

        <!-- Access Section -->
        <h3 style="margin:22px 0 12px 0; font-size:17px; color:#b71c1c; font-weight:600;">
          Access Your Learning
        </h3>
        ${items.map(item => {
        const courseLink = `https://vizuara.ai/courses/${item.itemId}`;
        return `
            <p style="margin:6px 0; font-size:15px;">
              <strong>${item.name}:</strong><br>
              <a href="${courseLink}" style="color:#d32f2f; text-decoration:none; word-break:break-all;">
                ${courseLink}
              </a>
            </p>
          `;
      }).join('')}

        <p style="margin:6px 0; font-size:15px;">
          <strong>Dashboard:</strong><br>
          <a href="https://vizuara.ai/dashboard" style="color:#d32f2f; text-decoration:none; word-break:break-all;">
            https://vizuara.ai/dashboard
          </a>
        </p>

        <p style="margin:6px 0 20px 0; font-size:15px;">
          <strong>Your Invoice:</strong><br>
          <a href="https://vizuara.ai/invoices/${orderId}" style="color:#d32f2f; text-decoration:none; word-break:break-all;">
            https://vizuara.ai/invoices/${orderId}
          </a>
        </p>

        <!-- Footer Note -->
        
        <p style="font-size:13px; color:#777; margin:6px 0 0 0;">
          This is a no reply email. Replies to this address are not monitored.
        </p>

        <p style="margin-top:16px; font-size:15px;">
          Best regards<br>
          <strong style="color:#b71c1c;">Team Vizuara</strong>
        </p>

      </div>
    </div>
  </div>
  `,
    };

    await brevoApi.sendTransacEmail(sendSmtpEmail);

    return { success: true };
  } catch (error: any) {
    logger.error("Error sending invoice:", error);
    return { success: false, error: error.message };
  }
};

export async function sendPaymentFailedEmail({ email, name, }: { email: string, name: string }, brevoApiKey: string) {
  try {
    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

    const sendSmtpEmail = {
      sender: { name: "Vizuara", email: "no_reply@vizuara.com" },
      to: [{ email }],
      bcc: [{ email: "thesreedath@gmail.com" }, { email: "raj.dandekar8@gmail.com" }, { email: "rajatdandekar@gmail.com" }], // internal monitoring copy
      subject: `[Team Vizuara] Payment Failed`,
      htmlContent: `
        <p>Dear ${name},</p>
        <p>We're sorry, but your recent payment, could not be processed.</p>
        <p>Please check your payment details or try again later.</p>
        <p>Best regards,<br/>Team Vizuara</p>
      `,
    };

    const result = await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log("❌ Payment failed email sent successfully:", result);
  } catch (error) {
    console.error("🚨 Error sending payment failed email:", error);
  }
};
