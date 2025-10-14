import { useEffect, useState } from "react";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/firebaseConfig";


export default function VerifyEmail() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const verifyEmail = async () => {
      const query = new URLSearchParams(window.location.search);
      const code = query.get("oobCode");

      if (!code) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        await applyActionCode(auth, code);
      } catch (error) {
        console.error("Email verification failed:", error);
        setStatus("error");
        setMessage("The verification link is invalid or expired.");
        return;
      }
      setStatus("success");
      setMessage("Your email has been verified successfully!");
    };

    void verifyEmail(); // Run async function safely
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Logo"
        className="w-20 h-20 mb-6"
      />

      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h1 className="text-lg font-semibold text-gray-700">
              Verifying your email...
            </h1>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-semibold text-green-600 mb-2">
              ✅ Verified!
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <a
              href="/auth/login"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
            >
              Go to Login
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-semibold text-red-600 mb-2">
              ❌ Verification Failed
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <a
              href="/resend-verification"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
            >
              Resend Email
            </a>
          </>
        )}
      </div>

      <p className="text-gray-400 text-sm mt-6">
        © {new Date().getFullYear()} Vizuara AI Labs. All rights reserved.
      </p>
    </div>
  );
}
