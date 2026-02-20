import React, { Suspense, lazy, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { courseService } from "@/services/courseService";
import { enrollmentService } from "@/services/enrollmentService";
import { logError } from "@/utils/logger";

// Lazy load QRCode for better performance
const QRCode = lazy(() => import("react-qr-code"));

// =============================================================================
// TYPES
// =============================================================================

interface PublicCertificateData {
  userName: string;
  courseName: string;
  courseId: string;
  completionDate: string | null;
  certificateName?: string | null;
  preferredName?: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CERTIFICATE_WIDTH = 800;
const CERTIFICATE_HEIGHT = 600;
const MOBILE_BREAKPOINT = 840;
const PADDING_BUFFER = 32;

// =============================================================================
// COMPONENT
// =============================================================================

const PublicCertificate: React.FC = () => {
  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const { certificateId } = useParams<{ certificateId: string }>();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<PublicCertificateData | null>(null);
  const [scale, setScale] = useState(1);

  // Additional state for custom certificate name
  const [customCertificateName, setCustomCertificateName] = useState<string | null>(null);

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
    const fetchCertificate = async () => {
      if (!certificateId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // 1. Fetch basic certificate data
        const result = await enrollmentService.getCertificateByCertificateId(certificateId);
        if (result.success && result.data) {
          setData(result.data);

          // 2. Fetch custom certificate name from course (if courseId is available)
          if (result.data.courseId) {
            try {
              const certificateName = await courseService.getCertificateNamebyID(
                result.data.courseId
              );
              if (certificateName) {
                setCustomCertificateName(certificateName);
              }
            } catch (err) {
              logError("PublicCertificate.fetchCertificate", err);
            }
          }
        } else {
          setData(null);
        }
      } catch (err) {
        console.error("Error fetching certificate:", err);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId]);

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  // Generate URL for QR Code verification
  const qrUrl = certificateId
    ? `${window.location.origin}/certificate/public/view/${certificateId}`
    : window.location.origin;

  // Calculate wrapper margin for scaled content
  const scaledMarginBottom = `-${(1 - scale) * CERTIFICATE_HEIGHT}px`;

  // Determine the name to display on certificate (preferred name takes priority)
  const nameOnCertificate = data?.preferredName || data?.userName || "";

  // Determine the course name to display (custom certificate name takes priority)
  const displayCourseName =
    customCertificateName || data?.certificateName || data?.courseName || "";

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
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No Certificate Found.</p>
          <p className="text-sm text-gray-400">
            The certificate you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main Certificate
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      {/* ===== CERTIFICATE WRAPPER (handles mobile scaling) ===== */}
      <div
        className="certificate-wrapper transition-transform origin-top-center duration-300 ease-out"
        style={{
          transform: `scale(${scale})`,
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
                    src="/RedPanda Learns_Logo_Design.png"
                    alt="RedPanda Learns"
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
                  RedPanda Learns
                </h2>

                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-4">
                  CONGRATULATIONS ON COMPLETING
                </p>

                {/* Course Name */}
                <h1 className="text-[2.25rem] font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight -ml-1">
                  {displayCourseName}
                </h1>

                <p className="text-sm text-gray-600 font-medium max-w-md leading-relaxed">
                  Successfully completed the course, assignments and received passing grade.
                </p>
              </div>

              {/* Footer Section */}
              <div className="flex justify-end items-end mt-8">
                {/* Student Name & Completion Date */}
                <div className="mb-2 ml-[-10px] absolute left-20 bottom-10">
                  <div
                    className="text-[2rem] text-gray-900 mb-2 leading-none pl-1"
                    style={{ fontFamily: '"Figtree", sans-serif' }} // Default Figtree for other text
                  >
                    <span
                      className="text-[1.75rem] text-gray-900 mb-2 leading-none pl-1"
                      style={{ fontFamily: '"Figtree", sans-serif' }} // Default Figtree
                    >
                      {nameOnCertificate}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">
                    Course completed on {data.completionDate || new Date().toLocaleDateString()}
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

      {/* Certificate ID */}
      <div className="mt-6 text-xs text-gray-400 text-center">Certificate ID: {certificateId}</div>

      {/* Mobile Hint */}
      <div className="mt-4 text-xs text-gray-400 md:hidden text-center">
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

export default PublicCertificate;
