import { Button } from "@/components/ui/button";
import { USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { enrollmentService } from "@/services/enrollmentService";
import { learningProgressService } from "@/services/learningProgressService";
import { Enrollment } from "@/types/enrollment";
import { Download, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShareCertificate from "./ShareCertificate";

const Certificate: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<Enrollment | null>(null);
  const [completionDate, setCompletionDate] = useState<string | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user.id !== enrollmentId.split("_")[0] && user.role !== USER_ROLE.ADMIN) {
      navigate("/dashboard");
    }

    const fetchEnrollmentAndCompletion = async () => {
      setIsLoading(true);
      try {
        const enrollmentResult =
          await enrollmentService.getEnrollmentById(enrollmentId!);

        if (enrollmentResult.success) {
          const enrollment = enrollmentResult.data;
          setEnrollmentData(enrollment);

          const completionResult =
            await learningProgressService.getFormattedCompletionDateAndCertificateId(
              enrollment.userId,
              enrollment.courseId
            );

          if (completionResult.success) {
            setCompletionDate(completionResult.data.completionDate);
            setCertificateId(completionResult.data.certificateId);
          }
        }
      } catch (error) {
        console.error("Error fetching certificate data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollmentAndCompletion();
  }, [enrollmentId]);


  const handlePrint = () => {
    setIsPrinting(true);

    // Create a print-specific stylesheet
    const printStyles = `
      @media print {
        body, html {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          background: white !important;
        }

        body * {
          visibility: hidden;
        }
        
        .certificate-container, 
        .certificate-container * {
          visibility: visible !important;
        }
        
        .certificate-container {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: 760px !important;
          height: 540px !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: 1px solid #ddd !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          transform: none !important;
          zoom: 1 !important;
        }
        
        .print-button,
        .print-instructions {
          display: none !important;
        }
        
        @page {
          size: auto !important;
          margin: 0 !important;
        }
      }
    `;

    // Add print styles
    const styleSheet = document.createElement("style");
    styleSheet.innerHTML = printStyles;
    document.head.appendChild(styleSheet);

    // Trigger print
    window.print();

    // Clean up
    setTimeout(() => {
      document.head.removeChild(styleSheet);
      setIsPrinting(false);
    }, 100);
  };

  const handleDownloadAsImage = async () => {
    try {
      setIsPrinting(true);

      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      const certificateElement = document.querySelector('.certificate-container') as HTMLElement;

      if (certificateElement) {
        // Hide the print button temporarily
        const printButton = document.querySelector('.print-button');
        if (printButton) (printButton as HTMLElement).style.display = 'none';

        const canvas = await html2canvas(certificateElement, {
          scale: 2, // Higher resolution
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          width: 760,
          height: 540,
          windowWidth: 760,
          windowHeight: 540
        });

        // Show the print button again
        if (printButton) (printButton as HTMLElement).style.display = '';

        // Convert canvas to image and download
        const link = document.createElement('a');
        link.download = `vizuara-certificate-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate. Please try the print option instead.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading certificate...</p>
      </div>
    );
  }

  if (!enrollmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No Certificate Exists.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 p-4 print:p-0">
      {/* Action Buttons */}
      <div className="fixed top-6 right-6 z-50 flex gap-3 print-button">
        <ShareCertificate certificateId={certificateId} />
        <Button
          onClick={handleDownloadAsImage}
          disabled={isPrinting}
          variant="outline"
          className="bg-secondary text-black hover:text-secondary hover:bg-primary"
        >
          <Download className="h-4 w-4 mr-2" />
          {isPrinting ? "Processing..." : "Download PNG"}
        </Button>
        <Button
          onClick={handlePrint}
          disabled={isPrinting}
          className="bg-secondary text-black hover:text-secondary hover:bg-primary"
        >
          <Printer className="h-4 w-4 mr-2" />
          {isPrinting ? "Preparing..." : "Print Certificate"}
        </Button>
      </div>
      <div className="max-w-full overflow-scroll lg:overflow-visible"> {/* Allow horizontal scroll for smaller screens */}
        {/* Certificate Container - Exact Fixed Size */}
        <div className="relative w-[760px] h-[540px] bg-white shadow-xl border border-gray-300 overflow-hidden certificate-container print:shadow-none">
          {/* Decorative border */}
          <div className="absolute inset-4 border-2 border-gray-100 pointer-events-none" />

          {/* Left ribbon */}
          <div className="absolute left-10 top-0 w-32 bg-gray-100 flex flex-col items-center pt-10 z-20">
            <div className="text-[14px] font-bold tracking-[0.2em] text-gray-500 mb-4 text-center">
              VERIFIED<br />CERTIFICATE
            </div>

            <div className="w-32 h-32 flex items-center justify-center">
              <div className="flex flex-col items-center text-center">
                <img src="/certificate-logo.png" alt="Vizuara Logo" className="mb-2 w-[90%]" />
              </div>
            </div>
            <div className="absolute -bottom-10 w-20 h-20 bg-gray-100 transform rotate-45 -z-10 scale-110" />
          </div>

          {/* Main body */}
          <div className="h-full px-14 py-12 flex flex-col justify-between">
            {/* Header + title */}
            <div className="ml-40">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Vizuara AI Labs
                </h1>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-gray-800">
                  Congratulations on completing
                </p>

                <h2 className="text-4xl font-semibold text-gray-900 leading-tight w-96">
                  {enrollmentData.courseName}
                </h2>

                <p className="mt-3 text-xs font-bold text-gray-500 max-w-72">
                  Successfully completed the course, assignments and
                  received passing grade.
                </p>
              </div>
            </div>
            {/* Footer area */}
            <div className="flex justify-between items-end">
              {/* Name + date */}
              <div>
                <p className="text-lg font-medium text-gray-800">
                  {enrollmentData.userName}
                </p>
                <p className="text-xs font-medium text-gray-800 mt-1">
                  Course completed on {completionDate ?? "—"}
                </p>
              </div>

              {/* Signatures */}
              <div className="text-right space-y-4 text-xs text-gray-700">
                <div>
                  <p className="h-4 text-xs font-bold text-gray-400 italic">
                    <img
                      src="/images/signatures/raj-dandekar-signature.png"
                      alt="Signature of Dr. Raj Dandekar"
                      className="h-4 mx-auto"
                    />
                  </p>
                  <p className="font-bold text-xs">
                    Dr. Raj Dandekar (MIT PhD)
                  </p>
                </div>
                <div>
                  <p className="h-4 text-xs font-bold text-gray-400 italic" >
                    <img
                      src="/images/signatures/rajat-dandekar-signature.png"
                      alt="Signature of Dr. Rajat Dandekar"
                      className="h-4 mx-auto"
                    />
                  </p>
                  <p className="font-bold text-xs">
                    Dr. Rajat Dandekar (Purdue PhD)
                  </p>
                </div>
                <div>
                  <p className="h-4 text-xs font-bold text-gray-400 italic">
                    <img
                      src="/images/signatures/sreedath-panat-signature.png"
                      alt="Signature of Dr. Sreedath Panat"
                      className="h-3 mx-auto"
                    />
                  </p>
                  <p className="font-bold text-xs">
                    Dr. Sreedath Panat (MIT PhD)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
