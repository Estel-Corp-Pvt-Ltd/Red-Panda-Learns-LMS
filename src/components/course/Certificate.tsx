import { Button } from "@/components/ui/button";
import { USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { enrollmentService } from "@/services/enrollmentService";
import { learningProgressService } from "@/services/learningProgressService";
import { Enrollment } from "@/types/enrollment";
import { Download, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useNavigate, useParams } from "react-router-dom";
import ShareCertificate from "./ShareCertificate";
import { courseService } from "@/services/courseService";

const Certificate: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<Enrollment | null>(null);
  const [completionDate, setCompletionDate] = useState<string | null>(null);
  const [certificateId, setCertificateId] = useState<string | null>(null);
    const [certificateName, setCertificateName] = useState<string | null>(null);
  // State for mobile scaling
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Load Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;600;700&family=Merriweather:wght@300;400;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Handle Mobile Scaling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = window.innerWidth;
        // 840 is the certificate base width (800) + margins. 
        if (parentWidth < 840) {
          const newScale = (parentWidth - 32) / 800; // 32px padding buffer
          setScale(newScale);
        } else {
          setScale(1);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user.id !== enrollmentId?.split("_")[0] && user.role !== USER_ROLE.ADMIN) {
      navigate("/dashboard");
    }

    const fetchEnrollmentAndCompletion = async () => {
      setIsLoading(true);
      try {
        const enrollmentResult = await enrollmentService.getEnrollmentById(enrollmentId!);

        if (enrollmentResult.success) {
          const enrollment = enrollmentResult.data;
          setEnrollmentData(enrollment);

          const completionResult = await learningProgressService.getFormattedCompletionDateAndCertificateId(
            enrollment.userId,
            enrollment.courseId
          );

          if (completionResult.success) {
            setCompletionDate(completionResult.data.completionDate);
            setCertificateId(completionResult.data.certificateId);
          }


             try{
              const certificateName = await courseService.getCetificateNamebyID(enrollment.courseId);
              setCertificateName(certificateName);

            }
            catch(error){
              console.error("Error fetching certificate name:", error);
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
    styleSheet.innerHTML = printStyles;
    document.head.appendChild(styleSheet);

    setTimeout(() => {
      window.print();
      document.head.removeChild(styleSheet);
      setIsPrinting(false);
    }, 100);
  };

  const handleDownloadAsImage = async () => {
    try {
      setIsPrinting(true);
      const html2canvas = (await import('html2canvas')).default;
      const element = document.querySelector('.certificate-container') as HTMLElement;

      if (element) {
        const canvas = await html2canvas(element, {
          scale: 3, // High resolution
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const link = document.createElement('a');
        link.download = `vizuara-certificate-${certificateId || 'download'}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  // Generate URL for QR Code
  const qrUrl = certificateId 
    ? `${window.location.origin}/certificate/public/view/${certificateId}`
    : window.location.origin;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!enrollmentData) return <div className="min-h-screen flex items-center justify-center">No Certificate Found.</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 print:p-0 font-sans">
      
      {/* Controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print-hide">
        <ShareCertificate certificateId={certificateId} />
        <Button onClick={handleDownloadAsImage} disabled={isPrinting} variant="outline" className="bg-white shadow-sm">
          <Download className="h-4 w-4 mr-2" /> {isPrinting ? "..." : "Download"}
        </Button>
        <Button onClick={handlePrint} disabled={isPrinting} className="bg-white text-black hover:bg-gray-100 shadow-sm border">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      {/* Scaling Wrapper for Mobile */}
      <div 
        ref={containerRef}
        className="certificate-wrapper transition-transform origin-top-center duration-300 ease-out"
        style={{ 
          transform: `scale(${isPrinting ? 1 : scale})`,
          marginBottom: isPrinting ? 0 : `-${(1 - scale) * 600}px` 
        }}
      >
        {/* CERTIFICATE CONTAINER - Fixed Size 800x600px */}
        <div className="certificate-container relative w-[800px] h-[600px] bg-white text-gray-900 shadow-2xl overflow-hidden mx-auto">
          
          {/* Background Texture (Subtle) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ 
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
               }} 
          />

          {/* QR Code - Top Right */}
          <div className="absolute top-8 right-8 z-10">
             <div className="bg-white p-1">
               <QRCode 
                 value={qrUrl}
                 size={64}
                 fgColor="#000000"
                 bgColor="#ffffff"
                 level="M"
               />
             </div>
          </div>

          <div className="flex h-full">
            
            {/* LEFT SIDE: Ribbon */}
            <div className="relative w-[30%] h-full">
              {/* Ribbon Graphic - Increased Size */}
              <div 
                className="absolute top-0 left-8 w-44 h-[380px] bg-slate-100 shadow-sm flex flex-col items-center pt-10 z-20"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)" }} 
              >
                <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 text-center leading-relaxed font-sans mb-8">
                  VERIFIED<br />CERTIFICATE
                </span>

                {/* Vizuara Logo - Increased Size */}
                <div className="w-32 h-32 mb-2 flex items-center justify-center">
                  <img 
                    src="/certificate-logo.png" 
                    alt="Vizuara AI Labs" 
                    className="w-full h-full object-contain drop-shadow-sm" 
                  />
                </div>
                
                {/* Logo Text/Pill */}
                <div className="mt-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                  <span className="text-[10px] font-bold text-purple-600 tracking-wider">VIZUARA AI LABS</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Content */}
            <div className="flex-1 pt-16 pr-12 pb-12 flex flex-col justify-between pl-6">
              
              {/* Header Content */}
              <div>
                <h2 className="text-4xl font-bold text-gray-900 font-sans tracking-tight mb-8">
                  Vizuara AI Labs
                </h2>

                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-4 font-sans">
                  CONGRATULATIONS ON COMPLETING
                </p>

                {/* Course Name - Main Title */}
                <h1 className="text-[3.25rem] font-bold text-gray-900 leading-[1.1] mb-6 font-sans tracking-tight -ml-1">
                {certificateName || enrollmentData.courseName}
                </h1>

                <p className="text-sm text-gray-600 font-medium max-w-md leading-relaxed font-sans">
                  Successfully completed the course, assignments and received passing grade.
                </p>
              </div>

              {/* Footer / Signatures */}
              <div className="flex justify-between items-end mt-8">
                
                {/* Student Name & Date */}
                <div className="mb-2">
                  <div className="text-[2.5rem] text-gray-900 mb-2 leading-none pl-1" style={{ fontFamily: '"Great Vibes", cursive' }}>
                    {enrollmentData.userName}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-sans mt-3">
                    Course completed on {completionDate || new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* Signatures List - Right Aligned */}
                <div className="flex flex-col space-y-6 text-right pb-1">
                  
                  {/* Signature 1 */}
                  <div className="flex flex-col items-end">
                    <div className="text-[11px] font-serif font-bold text-gray-800 mb-1">
                      Dr. Raj Dandekar (MIT PhD)
                    </div>
                    <img src="/images/signatures/raj-dandekar-signature.png" alt="Signature" className="h-6 opacity-80" />
                  </div>

                  {/* Signature 2 */}
                  <div className="flex flex-col items-end">
                    <div className="text-[11px] font-serif font-bold text-gray-800 mb-1">
                      Dr. Rajat Dandekar (Purdue PhD)
                    </div>
                    <img src="/images/signatures/rajat-dandekar-signature.png" alt="Signature" className="h-6 opacity-80" />
                  </div>

                  {/* Signature 3 */}
                  <div className="flex flex-col items-end">
                    <div className="text-[11px] font-serif font-bold text-gray-800 mb-1">
                      Dr. Sreedath Panat (MIT PhD)
                    </div>
                    <img src="/images/signatures/sreedath-panat-signature.png" alt="Signature" className="h-5 opacity-80" />
                  </div>

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

export default Certificate;