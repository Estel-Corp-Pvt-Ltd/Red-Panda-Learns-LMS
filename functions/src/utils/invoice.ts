import * as brevo from "@getbrevo/brevo";
import { logger } from "firebase-functions";
import { TransactionLineItem } from "../types/transaction";

export type PaymentDetails = {
  name: string;
  email: string,
  amount: number,
  currency: string,
  items: TransactionLineItem[]
};

export const sendPaymentConfirmation = async (data: PaymentDetails, brevoApiKey: string) => {
  const { name, email, amount, currency, items } = data;

  try {
    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

    // --- Prepare and send email via Brevo ---
    const sendSmtpEmail = {
      sender: { name: "Vizuara", email: "no_reply@vizuara.com" },
      to: [{ email }],
      bcc: [{ email: "thesreedath@gmail.com" }],
      subject: "Payment Confirmation - Vizuara",
      htmlContent: `
    <p>Dear ${name},</p>
    <p>Thank you for your purchase.</p>
    <p><strong>Amount:</strong> ${currency}${amount}</p>
    <p><strong>Items Purchased:</strong></p>
    <ul>
      ${items.map(item => `<li>${item.name}</li>`).join('')}
    </ul>
    <p>If you have any questions, feel free to contact our support team at 
      <a href="mailto:support@vizuara.com">support@vizuara.com</a>.
    </p>
    <p>Best regards,<br/>Vizuara Team</p>
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
      bcc: [{ email: "thesreedath@gmail.com" }], // internal monitoring copy
      subject: "Payment Failed - Action Required",
      htmlContent: `
        <p>Dear ${name},</p>
        <p>We're sorry, but your recent payment, could not be processed.</p>
        <p>Please check your payment details or try again later.</p>
        <p>If the issue persists, contact our support team at 
          <a href="mailto:support@vizuara.com">support@vizuara.com</a>.
        </p>
        <p>Best regards,<br/>Vizuara Team</p>
      `,
    };

    const result = await brevoApi.sendTransacEmail(sendSmtpEmail);
    console.log("❌ Payment failed email sent successfully:", result);
  } catch (error) {
    console.error("🚨 Error sending payment failed email:", error);
  }
};
