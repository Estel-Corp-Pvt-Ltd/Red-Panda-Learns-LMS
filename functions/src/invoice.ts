// import html_to_pdf from "html-pdf-node";
import * as brevo from "@getbrevo/brevo";
// import { generateInvoiceHTML } from "./templates/invoiceTemplate";
import {
  CustomerInfo,
  // InvoiceData 
} from "./types/invoice";

// const generatePdfAsync = (file: any, options: any): Promise<Buffer> => {
//   return new Promise((resolve, reject) => {
//     html_to_pdf.generatePdf(file, options, (error: Error | null, buffer: Buffer) => {
//       if (error) {
//         reject(error);
//       } else {
//         resolve(buffer);
//       }
//     });
//   });
// };

type InvoiceDetails = {
  name: string;
  email: string,
  amount: number,
  billTo: CustomerInfo,
  shipTo: CustomerInfo,
};

export const sendInvoice = async (data: InvoiceDetails, brevoApiKey: string) => {
  const {
    name,
    email,
    amount,
    // billTo,
    // shipTo
  } = data;

  try {
    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );
    // const invoiceData: InvoiceData = {
    //   company: {
    //     name: "VIZUARA TECHNOLOGIES PRIVATE LIMITED",
    //     address: {
    //       line1: "759/107/3 FLAT NO 201",
    //       line2: "SARASWATI 2ND FLOOR Prabhat Road",
    //       city: "Pune",
    //       state: "Maharashtra",
    //       country: "India",
    //       postalCode: "411004"
    //     },
    //     gstin: "27AAJCV1928J1ZY",
    //     phone: "7994206324",
    //     email: "sreedath@vizuara.com",
    //     website: "www.vizuara.ai"
    //   },
    //   invoiceNumber: "VIL/25-26/793",
    //   invoiceDate: "26/09/2025",
    //   dueDate: "26/09/2025",
    //   terms: "Due on Receipt",
    //   placeOfSupply: "Karnataka (29)",
    //   billTo: billTo,
    //   shipTo: shipTo,
    //   items: [
    //     {
    //       description: "Language + Reasoning + Vision Bootcamps Bundle",
    //       hsnSac: "999293",
    //       quantity: 1.00,
    //       rate: 38135.60,
    //       igstPercentage: 18,
    //       igstAmount: 6864.41,
    //       amount: 38135.60
    //     },
    //     {
    //       description: "Transformers for Vision and Multimodal LLMs [PRO]",
    //       hsnSac: "999293",
    //       quantity: 1.00,
    //       rate: 21186.44,
    //       igstPercentage: 18,
    //       igstAmount: 3813.56,
    //       amount: 21186.44
    //     },
    //     {
    //       description: "LLM Production and Deployment [July 2025 Cohort]",
    //       hsnSac: "999293",
    //       quantity: 1.00,
    //       rate: 16949.15,
    //       igstPercentage: 18,
    //       igstAmount: 3050.84,
    //       amount: 16949.15
    //     }
    //   ],
    //   subtotal: 76271.19,
    //   totalTax: 13728.81,
    //   total: 90000.00,
    //   paymentMade: 90000.00,
    //   balanceDue: 0.00,
    //   bankDetails: {
    //     bankName: "HDFC Bank Ltd.",
    //     branch: "Bhandarkar Road, Pune",
    //     accountNumber: "50200077796634",
    //     ifscCode: "HDFC0000007"
    //   },
    //   totalInWords: "Indian Rupee Ninety Thousand Only"
    // };

    // --- Generate PDF --
    console.time("generateInvoice");
    // const file = { content: generateInvoiceHTML(invoiceData) };
    // const pdfBuffer = await generatePdfAsync(file, { format: "A4", printBackground: true });
    // const attachmentBase64 = pdfBuffer.toString("base64");
    console.timeEnd("generateInvoice");

    console.log("Attachment prepared:", {
      name: `invoice-${name.replace(/\s+/g, "_")}.pdf`,
      // size: attachmentBase64.length,
      recipient: email
    });

    // --- Prepare and send email via Brevo ---
    const sendSmtpEmail = {
      sender: { name: "Vizuara", email: "support@vizuara.com" },
      to: [{ email }],
      bcc: [{ email: "thesreedath@gmail.com" }],
      subject: "Your Invoice",
      htmlContent: `
    <p>Dear ${name},</p>
    <p>Thank you for your purchase. Please find your invoice attached below.</p>
    <p><strong>Amount:</strong> $${amount}</p>
    <p>Best regards,<br/>YourApp Team</p>
  `,
      // attachment: [
      //   {
      //     content: attachmentBase64,
      //     name: `invoice-${name.replace(/\s+/g, "_")}.pdf`,
      //   },
      // ],
    };

    await brevoApi.sendTransacEmail(sendSmtpEmail);

    return { success: true };
  } catch (error: any) {
    console.error("Error sending invoice:", error);
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
      sender: { name: "Vizuara", email: "support@vizuara.com" },
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
