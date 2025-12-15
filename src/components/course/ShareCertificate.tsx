import { Button } from "@/components/ui/button";
import {
    Share2,
    Copy,
    Facebook,
    Linkedin,
    Mail,
    MessageCircle,
    Twitter
} from "lucide-react";
import { useState } from "react";

const ShareCertificate: React.FC<{ certificateId: string | null }> = ({ certificateId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!certificateId) return null;

    const certificateUrl =
        `${window.location.origin}/certificate/public/view/${certificateId}`;

    const encodedUrl = encodeURIComponent(certificateUrl);

    const shareText = encodeURIComponent(
        `Check out my certificate from Vizuara AI Labs!\n${certificateUrl}`
    );

    const handleShare = (
        platform: "whatsapp" | "x" | "email" | "facebook" | "linkedin"
    ) => {
        let url = "";

        switch (platform) {
            case "whatsapp":
                url = `https://wa.me/?text=${shareText}`;
                break;

            case "x":
                url = `https://x.com/intent/tweet?text=${shareText}`;
                break;

            case "email":
                url = `mailto:?subject=${encodeURIComponent(
                    "My Vizuara AI Labs Certificate"
                )}&body=${shareText}`;
                break;

            case "facebook":
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;

            case "linkedin":
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
        }

        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(certificateUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                className="bg-secondary text-black hover:text-secondary hover:bg-primary"
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
                        <h3 className="text-lg font-semibold">Share Your Certificate</h3>
                        <p className="text-sm text-gray-600">
                            Choose a platform to share or copy the public link.
                        </p>

                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => handleShare("whatsapp")}
                                className="bg-green-500 hover:bg-green-600 text-white flex gap-2"
                            >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                            </Button>

                            <Button
                                onClick={() => handleShare("x")}
                                className="bg-black hover:bg-gray-900 text-white flex gap-2"
                            >
                                <Twitter className="h-4 w-4" />
                                X (Twitter)
                            </Button>

                            <Button
                                onClick={() => handleShare("facebook")}
                                className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2"
                            >
                                <Facebook className="h-4 w-4" />
                                Facebook
                            </Button>

                            <Button
                                onClick={() => handleShare("linkedin")}
                                className="bg-[#0A66C2] hover:bg-[#004182] text-white flex gap-2"
                            >
                                <Linkedin className="h-4 w-4" />
                                LinkedIn
                            </Button>

                            <Button
                                onClick={() => handleShare("email")}
                                className="bg-gray-800 hover:bg-gray-900 text-white flex gap-2"
                            >
                                <Mail className="h-4 w-4" />
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
                            className="w-full"
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
