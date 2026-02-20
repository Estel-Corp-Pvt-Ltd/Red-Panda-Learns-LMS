import { sendMailtoUserOnAssignmentGraded } from "./email/sendMailtoUserOnAssignmentGraded";
import {
  buildGradedResultEmail,
  buildReGradedResultEmail,
} from "./email/templates/buildGradedResultEmail";

export async function sendGradedAssignmentNotification(
  email: string,
  userName: string,
  marks: number,
  assignmentTitle: string,
  isReevaluated: boolean
) {
  try {
    if (!email) {
      return { success: false, error: "Email not available for this user" };
    }

    // Step 2: Prepare the evaluation link
    const evalLink = `https://RedPanda Learns.ai/submissions`;

    // Step 3: Build email HTML (using the single template)
    // ✅ Choose email template
    const html = isReevaluated
      ? buildReGradedResultEmail(evalLink, userName, marks, assignmentTitle)
      : buildGradedResultEmail(evalLink, userName, marks, assignmentTitle);

    const subject = isReevaluated
      ? `Hey ${userName}, Your Assignment Has Been Re-evaluated`
      : `Hey ${userName}, Your Assignment Has Been Graded!`;
    // Step 4: Send email using sendMail function
    await sendMailtoUserOnAssignmentGraded({
      to: email,
      subject: subject, // You can modify the subject
      html, // Email body in HTML format
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error };
  }
}
