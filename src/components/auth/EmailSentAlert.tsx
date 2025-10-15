import { CheckCircle2 } from "lucide-react";

const EmailSentPopup = ({ email, setVisible }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-[90%] text-center relative">
        <CheckCircle2 className="mx-auto text-green-500 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Verification Email Sent!
        </h2>
        <p className="text-gray-600 mb-4">
          A verification link has been sent to <strong>{email}</strong>.
        </p>
        <p className="text-gray-600 mb-6">
          Please check your inbox and click the link to verify your email.
        </p>
        <button
          onClick={() => setVisible(false)}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-green-600 transition"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default EmailSentPopup;
