import React from "react";
import { AlertTriangle } from "lucide-react";
import { sendEmailVerification, UserCredential } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userCredential: UserCredential;
  setVisible?: (state: boolean) => void;
}


const EmailNotVerifiedPopup: React.FC<Props> = ({ userCredential, setVisible }) => {
  const { toast } = useToast();

  const handleResend = async () => {
    try {
      await sendEmailVerification(userCredential.user);

      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and follow the instructions.",
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast({
        title: "Failed to send verification email.",
        description: "There was an issue sending the verification email. Try again later.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white border border-gray-400 rounded-xl shadow-2xl p-8 max-w-md w-[90%] text-center relative">
        <AlertTriangle className="mx-auto text-gray-800 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Email Not Verified
        </h2>
        <p className="text-gray-700 mb-4">
          Your email <strong>{userCredential.user.email}</strong> is not verified.
        </p>
        <p className="text-gray-600 mb-6">
          Please check your inbox and click the verification link to continue.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleResend}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Resend Email
          </button>
          <button
            onClick={() => setVisible?.(false)}
            className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailNotVerifiedPopup;
