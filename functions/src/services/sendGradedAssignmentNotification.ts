import { sendMailtoUserOnAssignmentGraded } from "./email/sendMailtoUserOnAssignmentGraded";
import { buildGradedResultEmail } from "./email/templates/buildGradedResultEmail";

export async function sendGradedAssignmentNotification(email : string , userName : string , marks : number , assignmentTitle:string) {
  try {

    if (!email) {
      return { success: false, error: "Email not available for this user" };
    }

    // Step 2: Prepare the evaluation link
     const evalLink = `https://vizuara.ai/submissions`;

    // Step 3: Build email HTML (using the single template)
    const html = buildGradedResultEmail(evalLink , userName , marks , assignmentTitle); // Use a single template function

    // Step 4: Send email using sendMail function
    await sendMailtoUserOnAssignmentGraded({
      to: email,
      subject: `Hey ${userName}, Your Assignment Has Been Graded!`, // You can modify the subject
      html, // Email body in HTML format
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error };
  }
}
