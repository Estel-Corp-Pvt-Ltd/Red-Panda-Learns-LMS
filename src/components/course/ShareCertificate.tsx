import { Button } from "@/components/ui/button";
import { Copy, Facebook, Mail, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

const ShareCertificate: React.FC<{
  certificateId: string | null;
  hasSharedCertificate: boolean;
  onFirstShare: () => void;
}> = ({ certificateId, hasSharedCertificate, onFirstShare }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!certificateId) return null;

  const publicUrl = `${window.location.origin}/certificate/public/view/${certificateId}`;
  const encodedPublicUrl = encodeURIComponent(publicUrl);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Store previous state (optional, but clean)
    const hadDarkClass = html.classList.contains("dark");

    // Force light mode
    html.classList.remove("dark");
    body.classList.remove("dark");

    return () => {
      // Restore previous state when leaving page
      if (hadDarkClass) {
        html.classList.add("dark");
        body.classList.add("dark");
      }
    };
  }, []);

  const handleShare = (platform: "whatsapp" | "x" | "email" | "facebook" | "linkedin") => {
    const firstShare = !hasSharedCertificate;

    if (firstShare) {
      onFirstShare();
    }
    let url = "";
    switch (platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(
          `Check out my certificate from RedPanda Learns!\n${publicUrl}`
        )}`;
        break;
      case "x":
        url = `https://x.com/intent/tweet?text=${encodeURIComponent(
          `I just earned a certificate from RedPanda Learns 🎓\n${publicUrl}`
        )}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent(
          "My RedPanda Learns Certificate"
        )}&body=${encodeURIComponent(`Here’s my certificate:\n${publicUrl}`)}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedPublicUrl}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedPublicUrl}`;
        break;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      {/* Always light theme button */}
      <Button
        variant="outline"
        className="bg-gray-200 text-black hover:bg-gray-300 hover:text-black !border-gray-300 !shadow-none"
        onClick={() => setIsOpen(true)}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-2 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Share Your Certificate</h3>
            <p className="text-sm text-gray-700">
              Choose a platform to share or copy the public link.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleShare("whatsapp")}
                className="bg-green-500 hover:bg-green-600 text-white flex gap-2"
              >
                <img src="/whatsapp-icon.png" className="w-6" alt="" />
                WhatsApp
              </Button>

              <Button
                onClick={() => handleShare("x")}
                className="bg-black hover:bg-gray-900 text-white flex gap-2"
              >
                <img src="/twitter-icon.png" className="w-6" alt="" />
                Twitter
              </Button>

              <Button
                onClick={() => handleShare("facebook")}
                className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2"
              >
                <Facebook className="h-5 w-5" />
                Facebook
              </Button>

              <Button
                onClick={() => handleShare("linkedin")}
                className="bg-[#0A66C2] hover:bg-[#004182] text-white flex gap-2"
              >
                <img src="/linkedin-icon.png" className="w-6" alt="" />
                LinkedIn
              </Button>

              <Button
                onClick={() => handleShare("email")}
                className="bg-gray-800 hover:bg-gray-900 text-white flex gap-2"
              >
                <Mail className="h-5 w-5" />
                Email
              </Button>

              <Button
                onClick={handleCopyLink}
                className="bg-gray-300 hover:bg-gray-400 text-black flex gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy Public Link"}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full bg-gray-200 text-black hover:bg-gray-300 hover:text-black !border-gray-300 !shadow-none"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareCertificate;
