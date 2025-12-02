import { useEffect, useState } from "react";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { enrollmentService } from "@/services/enrollmentService";
import { Enrollment } from "@/types/enrollment";
import { formatDate } from "@/utils/date-time";

const Certificate: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<Enrollment | null>(null);

  useEffect(() => {
    // You can use the enrollmentId to fetch certificate data if needed
    const fetchEnrollment = async () => {
      setIsLoading(true);
      try {
        const enrollmentResult = await enrollmentService.getEnrollmentById(enrollmentId!);
        if (enrollmentResult.success) {
          setEnrollmentData(enrollmentResult.data);
        }
      } catch (error) {
        console.error("Error fetching enrollment data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollment();
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
        <Button
          onClick={handleDownloadAsImage}
          disabled={isPrinting}
          variant="outline"
          className="border-flyred/40 text-flyred hover:bg-flyred/10"
        >
          <Download className="h-4 w-4 mr-2" />
          {isPrinting ? "Processing..." : "Download PNG"}
        </Button>
        <Button
          onClick={handlePrint}
          disabled={isPrinting}
          className="bg-flyred hover:bg-flyred/90 text-white shadow-lg"
        >
          <Printer className="h-4 w-4 mr-2" />
          {isPrinting ? "Preparing..." : "Print Certificate"}
        </Button>
      </div>
      <div className="max-w-full overflow-scroll"> {/* Allow horizontal scroll for smaller screens */}
        {/* Certificate Container - Exact Fixed Size */}
        <div className="relative w-[760px] h-[540px] bg-white shadow-xl border border-gray-300 overflow-hidden certificate-container print:shadow-none">
          {/* Decorative border */}
          <div className="absolute inset-4 border-2 border-gray-100 pointer-events-none" />

          {/* Left ribbon */}
          <div className="absolute left-10 top-0 w-32 bg-gradient-to-b from-gray-100 to-gray-50 flex flex-col items-center pt-10 z-20">
            <div className="text-[10px] tracking-[0.2em] text-gray-500 mb-4 text-center">
              VERIFIED<br />CERTIFICATE
            </div>

            <div className="w-24 h-24 flex items-center justify-center">
              <div className="flex flex-col items-center text-center">
                <img src="/logo.png" alt="Vizuara Logo" className="w-12 h-12 mb-2" />
                <div className="text-[9px] font-semibold tracking-wide text-pink-600 mb-1">
                  VIZUARA
                </div>
                <div className="flex justify-center items-center text-[8px] font-semibold text-white bg-purple-600 px-2 py-1 rounded-full">
                  AI LABS
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 w-20 h-20 bg-gray-50 transform rotate-45 -z-10 scale-110" />
          </div>

          {/* Main body */}
          <div className="h-full px-14 py-12 flex flex-col justify-between">
            {/* Header + title */}
            <div className="ml-40">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Vizuara AI Labs
                </h1>

                <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  Congratulations on completing
                </p>

                <h2 className="mt-3 text-4xl font-semibold text-gray-900 leading-tight w-96">
                  {enrollmentData.courseName}
                </h2>

                <p className="mt-3 text-xs text-gray-500 max-w-72">
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
                <p className="text-[10px] text-gray-500 mt-1">
                  Course completed on {formatDate(enrollmentData.updatedAt)}
                </p>
              </div>

              {/* Signatures */}
              <div className="text-right space-y-4 text-xs text-gray-700">
                <div>
                  <p className="h-4 text-[10px] text-gray-400 italic">
                    <img
                      src="/images/signatures/raj-dandekar-signature.png"
                      alt="Signature of Dr. Raj Dandekar"
                      className="h-4 mx-auto"
                    />
                  </p>
                  <p className="font-medium text-xs">
                    Dr. Raj Dandekar (MIT PhD)
                  </p>
                </div>
                <div>
                  <p className="h-4 text-[10px] text-gray-400 italic" >
                    <img
                      src="/images/signatures/rajat-dandekar-signature.png"
                      alt="Signature of Dr. Rajat Dandekar"
                      className="h-4 mx-auto"
                    />
                  </p>
                  <p className="font-medium text-xs">
                    Dr. Rajat Dandekar (Purdue PhD)
                  </p>
                </div>
                <div>
                  <p className="h-4 text-[10px] text-gray-400 italic">
                    <img
                      src="/images/signatures/shreedath-panat-signature.png"
                      alt="Signature of Dr. Sreedath Panat"
                      className="h-3 mx-auto"
                    />
                  </p>
                  <p className="font-medium text-xs">
                    Dr. Sreedath Panat (MIT PhD)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate ID (for verification) */}
          <div className="absolute bottom-6 left-14 text-[9px] text-gray-400">
            Certificate ID: {enrollmentData.id}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
