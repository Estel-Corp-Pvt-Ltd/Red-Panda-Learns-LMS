import { Button } from "@/components/ui/button";
import { USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { courseService } from "@/services/courseService";
import { enrollmentService } from "@/services/enrollmentService";
import { learningProgressService } from "@/services/learningProgressService";
import { Enrollment } from "@/types/enrollment";
import { Download, Printer } from "lucide-react";
import React, { Suspense, lazy, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShareCertificate from "./ShareCertificate";
import { formatDate } from "@/utils/date-time";
import { logError } from "@/utils/logger";
import { calculateKarmaForShareCertificate } from "@/services/calculateKarmaForShareCertificate";
import { authService } from "@/services/authService";
// Lazy load QRCode for better performance
const QRCode = lazy(() => import("react-qr-code"));

// =============================================================================
// TYPES
// =============================================================================

interface CertificateData {
  enrollment: Enrollment;
  completionDate: string | null;
  certificateId: string | null;
  certificateName: string | null;
  nameOnCertificate: string;
  hasSharedCertificate: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CERTIFICATE_WIDTH = 800;
const CERTIFICATE_HEIGHT = 600;
const MOBILE_BREAKPOINT = 840;
const PADDING_BUFFER = 32;
const MAX_NAME_LENGTH = 30;

// =============================================================================
// COMPONENT
// =============================================================================

const Certificate: React.FC = () => {
  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Certificate data
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);

  // Modal state
  const [showPreferredNameModal, setShowPreferredNameModal] = useState(false);
  const [preferredNameInput, setPreferredNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isNameRequired, setIsNameRequired] = useState(false);
  const [nameRequiredReason, setNameRequiredReason] = useState<string>("");

  // Mobile scaling
  const [scale, setScale] = useState(1);

  // ---------------------------------------------------------------------------
  // Authorization Check
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enrollmentId || !user) return;

    const userId = enrollmentId.split("_")[0];
    const isOwner = user.id === userId;
    const isAdmin = user.role === USER_ROLE.ADMIN;

    if (!isOwner && !isAdmin) {
      navigate("/dashboard");
    }
  }, [enrollmentId, user, navigate]);

  // ---------------------------------------------------------------------------
  // Mobile Scaling Handler
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleResize = () => {
      const parentWidth = window.innerWidth;

      if (parentWidth < MOBILE_BREAKPOINT) {
        const newScale = (parentWidth - PADDING_BUFFER) / CERTIFICATE_WIDTH;
        setScale(Math.max(0.3, newScale)); // Minimum scale of 0.3
      } else {
        setScale(1);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch Certificate Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchCertificateData = async () => {
      if (!enrollmentId) {
        setError("Invalid enrollment ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch enrollment
        const enrollmentResult = await enrollmentService.getEnrollmentById(enrollmentId);

        if (!enrollmentResult.success || !enrollmentResult.data) {
          throw new Error("Failed to fetch enrollment data");
        }

        const enrollment = enrollmentResult.data;

        // 2. Validate and normalize names
        const preferredName = (enrollment.certification.preferredName || "").trim();
        const userName = (enrollment.userName || "").trim();

        const preferredNameLower = preferredName.toLowerCase();
        const userNameLower = userName.toLowerCase();

        const hasValidPreferredName =
          preferredName.length > 0 &&
          !preferredNameLower.includes("null") &&
          preferredName.length <= MAX_NAME_LENGTH;

        const hasValidUserName = userName.length > 0 && !userNameLower.includes("null");

        // 3. Determine name requirement and reason
        let requireName = false;
        let reason = "";
        let showModal = false;

        if (!hasValidPreferredName) {
          showModal = true;

          if (!hasValidUserName) {
            // No valid names at all
            requireName = true;
            reason =
              userName.length === 0
                ? "Your profile name is not set. Please enter a name for your certificate."
                : "Your profile name appears to be invalid. Please enter a valid name for your certificate.";
          } else if (userName.length > MAX_NAME_LENGTH) {
            // Username too long
            requireName = true;
            reason = `Your name exceeds ${MAX_NAME_LENGTH} characters. Please set a shorter preferred name for your certificate.`;
          } else if (preferredNameLower.includes("null")) {
            // Preferred name contains "null"
            requireName = true;
            reason =
              "Your preferred name appears to be invalid. Please enter a valid name for your certificate.";
          }

          // Show toast only if name is required
          if (requireName) {
            toast({
              title:
                userName.length === 0
                  ? "Name required"
                  : userName.length > MAX_NAME_LENGTH
                  ? "Preferred name required"
                  : "Valid name required",
              description: reason,
              variant: "destructive",
            });
          }
        }

        setIsNameRequired(requireName);
        setNameRequiredReason(reason);
        setShowPreferredNameModal(showModal);

        // 4. Fetch certificate display name (optional - may fail gracefully)
        let certificateName: string | null = null;
        try {
          certificateName = await courseService.getCertificateNamebyID(enrollment.courseId);
        } catch (err) {
          logError("Certificate.fetchCertificateData", err);
        }

        // 5. Determine the name to display on certificate
        const nameOnCertificate = hasValidPreferredName
          ? preferredName
          : hasValidUserName
          ? userName
          : "";

        // 6. Set all certificate data
        setCertificateData({
          enrollment,
          completionDate: formatDate(enrollment?.completionDate) ?? null,
          certificateId: enrollment?.certification?.certificateId ?? null,
          certificateName,
          nameOnCertificate,
          hasSharedCertificate: enrollment?.certification?.hasSharedCertificate ?? false,
        });
      } catch (err) {
        console.error("Error fetching certificate data:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificateData();
  }, [enrollmentId]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle preferred name input change with character limit
   */
  const handlePreferredNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NAME_LENGTH) {
      setPreferredNameInput(value);
    }
  }, []);

  /**
   * Save the user's preferred name for the certificate
   */
  const handleSavePreferredName = useCallback(async () => {
    const trimmedName = preferredNameInput.trim();

    if (!trimmedName || !certificateData) return;

    // Check for "null" string in the name
    if (trimmedName.toLowerCase().includes("null")) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid name without 'null'.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      toast({
        title: "Name too long",
        description: `Please enter a name with ${MAX_NAME_LENGTH} characters or less.`,
        variant: "destructive",
      });
      return;
    }

    setIsSavingName(true);

    try {
      const result = await enrollmentService.updatePreferredNameOnCertificate(
        certificateData.enrollment.userId,
        certificateData.enrollment.courseId,
        trimmedName
      );

      if (result.success) {
        // Update the certificate data with new name
        setCertificateData((prev) =>
          prev
            ? {
                ...prev,
                nameOnCertificate: trimmedName,
              }
            : null
        );

        setShowPreferredNameModal(false);
        setPreferredNameInput("");
        setIsNameRequired(false);
        setNameRequiredReason("");

        toast({
          title: "Name saved",
          description: "Your preferred name has been set for the certificate.",
        });
      } else {
        console.error("Failed to save preferred name");
        toast({
          title: "Failed to save",
          description: "Could not save your preferred name. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error saving preferred name:", err);
      toast({
        title: "Error",
        description: "An error occurred while saving. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  }, [preferredNameInput, certificateData]);
  /**
   * Handle print functionality with custom print styles
   */
  const handlePrint = useCallback(() => {
    setIsPrinting(true);

    const printStyles = `
      @media print {
        @page { size: landscape; margin: 0; }
        body { 
          margin: 0; 
          -webkit-print-color-adjust: exact !important; 
          print-color-adjust: exact !important; 
        }
        .print-hide { display: none !important; }
        .certificate-wrapper {
          transform: scale(1) !important;
          height: 100vh;
          width: 100vw;
          display: flex;
          justify-content: center;
          align-items: center;
          background: white;
          margin: 0 !important;
        }
        .certificate-container {
          box-shadow: none !important;
          border: none !important;
          margin: 0 auto;
        }
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.id = "print-styles";
    styleSheet.innerHTML = printStyles;
    document.head.appendChild(styleSheet);

    setTimeout(() => {
      window.print();

      // Clean up print styles
      const printStyleElement = document.getElementById("print-styles");
      if (printStyleElement) {
        document.head.removeChild(printStyleElement);
      }

      setIsPrinting(false);
    }, 100);
  }, []);

  // --- MODIFIED CODE START ---
  const karmaCalculateOnSharedCertificate = async () => {
    if (!user || !certificateData) return;

    try {
      const idToken = await authService.getToken();
      if (!idToken) {
        console.warn("Failed to get ID token for karma calculation.");
        return;
      }

      await calculateKarmaForShareCertificate.awardKarmaForSharing(
        user.id,
        idToken,
        certificateData.enrollment.courseId
      );
    } catch (error) {
      console.error("Error calculating karma for shared certificate:", error);
      // Optionally, show a toast or handle the error gracefully
    }
  };

  /**
   * Download certificate as high-resolution PNG image
   */
  const handleDownloadAsImage = useCallback(async () => {
    try {
      setIsPrinting(true);

      const html2canvas = (await import("html2canvas")).default;
      const element = document.querySelector(".certificate-container") as HTMLElement;

      if (!element) {
        throw new Error("Certificate element not found");
      }

      const canvas = await html2canvas(element, {
        scale: 3, // High resolution for quality prints
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `vizuara-certificate-${certificateData?.certificateId || "download"}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (err) {
      console.error("Error downloading certificate:", err);
    } finally {
      setIsPrinting(false);
    }
  }, [certificateData?.certificateId]);

  /**
   * Close modal and skip setting preferred name (only if not required)
   */
  const handleCloseModal = useCallback(() => {
    if (isNameRequired) {
      toast({
        title: "Name required",
        description:
          nameRequiredReason ||
          `Please set a preferred name (max ${MAX_NAME_LENGTH} characters) to view your certificate.`,
        variant: "destructive",
      });
      return;
    }
    setShowPreferredNameModal(false);
    setPreferredNameInput("");
  }, [isNameRequired, nameRequiredReason]);

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  // Generate URL for QR Code verification
  const qrUrl = certificateData?.certificateId
    ? `${window.location.origin}/certificate/public/view/${certificateData.certificateId}`
    : window.location.origin;

  // Calculate wrapper margin for scaled content
  const scaledMarginBottom = isPrinting ? 0 : `-${(1 - scale) * CERTIFICATE_HEIGHT}px`;

  // Character count for input
  const remainingChars = MAX_NAME_LENGTH - preferredNameInput.length;

  // Get modal title based on reason
  const getModalTitle = () => {
    if (!isNameRequired) return "Preferred Name for Certificate";
    if (nameRequiredReason.includes("profile name is not set")) return "Name Required";
    if (nameRequiredReason.includes("invalid")) return "Valid Name Required";
    if (nameRequiredReason.includes("exceeds")) return "Preferred Name Required";
    return "Name Required";
  };

  // Get modal description
  const getModalDescription = () => {
    if (isNameRequired && nameRequiredReason) {
      return nameRequiredReason;
    }
    return "Please enter the name you would like to appear on your certificate.";
  };

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error State
  // ---------------------------------------------------------------------------
  if (error || !certificateData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || "No Certificate Found."}</p>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main Certificate
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 print:p-0 font-sans">
      {/* ===== PREFERRED NAME MODAL ===== */}
      {showPreferredNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 print-hide">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-semibold mb-2 text-black">{getModalTitle()}</h2>

            <p className="text-sm text-gray-600 mb-4">{getModalDescription()}</p>

            <div className="relative">
              <input
                type="text"
                value={preferredNameInput}
                onChange={handlePreferredNameChange}
                placeholder="Enter your name"
                maxLength={MAX_NAME_LENGTH}
                className="w-full border rounded-md px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-black text-black"
                disabled={isSavingName}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && preferredNameInput.trim()) {
                    handleSavePreferredName();
                  }
                }}
                autoFocus
              />
              <div
                className={`text-xs text-right mb-4 ${
                  remainingChars <= 5 ? "text-amber-600" : "text-gray-400"
                }`}
              >
                {remainingChars} characters remaining
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {!isNameRequired && (
                <Button variant="outline" onClick={handleCloseModal} disabled={isSavingName}>
                  Skip
                </Button>
              )}
              <Button
                onClick={handleSavePreferredName}
                disabled={isSavingName || !preferredNameInput.trim()}
              >
                {isSavingName ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONTROL BUTTONS ===== */}
      <div className="fixed top-4 right-4 z-40 flex gap-2 print-hide">
        <ShareCertificate
          certificateId={certificateData.certificateId}
          hasSharedCertificate={certificateData.hasSharedCertificate}
          onFirstShare={karmaCalculateOnSharedCertificate}
        />

        <Button
          onClick={handleDownloadAsImage}
          disabled={isPrinting}
          variant="outline"
          className="bg-white shadow-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          {isPrinting ? "..." : "Download"}
        </Button>

        <Button
          onClick={handlePrint}
          disabled={isPrinting}
          className="bg-white text-black hover:bg-gray-100 shadow-sm border"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* ===== CERTIFICATE WRAPPER (handles mobile scaling) ===== */}
      <div
        ref={containerRef}
        className="certificate-wrapper transition-transform origin-top-center duration-300 ease-out"
        style={{
          transform: `scale(${isPrinting ? 1 : scale})`,
          marginBottom: scaledMarginBottom,
        }}
      >
        {/* ===== CERTIFICATE CONTAINER ===== */}
        <div className="certificate-container relative w-[800px] h-[600px] bg-white text-gray-900 shadow-2xl overflow-hidden mx-auto font-sans">
          {/* Background Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* QR Code for Verification */}
          <div className="absolute top-8 right-8 z-10">
            <div className="bg-white p-1">
              <Suspense fallback={<div className="w-[64px] h-[64px] bg-gray-100 animate-pulse" />}>
                <QRCode value={qrUrl} size={64} fgColor="#000000" bgColor="#ffffff" level="M" />
              </Suspense>
            </div>
          </div>

          <div className="flex h-full">
            {/* ----- LEFT SIDE: Ribbon ----- */}
            <div className="relative w-[30%] h-full">
              <div
                className="absolute top-0 left-8 w-44 h-[380px] bg-slate-100 shadow-sm flex flex-col items-center pt-10 z-20"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)",
                }}
              >
                <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 text-center leading-relaxed mb-8">
                  VERIFIED
                  <br />
                  CERTIFICATE
                </span>

                {/* Company Logo */}
                <div className="w-36 h-36 mb-2 flex items-center justify-center">
                  <img
                    src="/Vizuara_Logo_Design.png"
                    alt="Vizuara AI Labs"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* ----- RIGHT SIDE: Content ----- */}
            <div className="flex-1 pt-16 pr-12 pb-12 flex flex-col justify-between pl-6">
              {/* Header Section */}
              <div>
                <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-8">
                  Vizuara AI Labs
                </h2>

                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-4">
                  CONGRATULATIONS ON COMPLETING
                </p>

                {/* Course Name */}
                <h1 className="text-[2.25rem] font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight -ml-1">
                  {certificateData.certificateName || certificateData.enrollment.courseName}
                </h1>

                <p className="text-sm text-gray-600 font-medium max-w-md leading-relaxed">
                  Successfully completed the course, assignments and received passing grade.
                </p>
              </div>

              {/* Footer Section */}
              <div className="flex justify-end items-end mt-8">
                {/* Student Name & Completion Date */}
                <div className="mb-2 ml-[-10px] absolute left-20 bottom-10 ">
                  {" "}
                  {/* Added negative margin-left */}
                  <div
                    className="text-[1.75rem] text-gray-900 mb-2 leading-none pl-1"
                    style={{ fontFamily: '"Figtree", sans-serif' }}
                  >
                    <span className="fancy-name">
                      {certificateData.nameOnCertificate || "Unknown"}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">
                    Course completed on{" "}
                    {certificateData.completionDate || new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex flex-col space-y-6 text-right pb-1">
                  <SignatureBlock
                    name="Dr. Raj Dandekar (MIT PhD)"
                    imageSrc="/images/signatures/raj-dandekar-signature.png"
                  />
                  <SignatureBlock
                    name="Dr. Rajat Dandekar (Purdue PhD)"
                    imageSrc="/images/signatures/rajat-dandekar-signature.png"
                  />
                  <SignatureBlock
                    name="Dr. Sreedath Panat (MIT PhD)"
                    imageSrc="/images/signatures/sreedath-panat-signature.png"
                    imageHeight="h-5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Hint */}
      <div className="mt-8 text-xs text-gray-400 print-hide md:hidden text-center">
        Pinch to zoom or rotate device for better view
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SignatureBlockProps {
  name: string;
  imageSrc: string;
  imageHeight?: string;
}

/**
 * Reusable signature block component
 */
const SignatureBlock: React.FC<SignatureBlockProps> = ({ name, imageSrc, imageHeight = "h-6" }) => (
  <div className="flex flex-col items-end">
    <div className="text-[11px] font-bold text-gray-800 mb-1">{name}</div>
    <img src={imageSrc} alt="Signature" className={`${imageHeight} opacity-80`} />
  </div>
);

export default Certificate;
