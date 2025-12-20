import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { learningProgressService } from "@/services/learningProgressService";

interface PublicCertificateData {
    userName: string;
    courseName: string;
    completionDate: string | null;
};

const PublicCertificate: React.FC = () => {
    const { certificateId } = useParams<{ certificateId: string }>();
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PublicCertificateData | null>(null);

    useEffect(() => {
        const fetchCertificate = async () => {
            setIsLoading(true);
            const result =
                await learningProgressService.getCertificateByCertificateId(
                    certificateId!
                );

            if (result.success) {
                setData(result.data);
                setIsLoading(false);
                return;
            }
            setData(null);
            setIsLoading(false);
        };

        fetchCertificate();
    }, [certificateId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading certificate…
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                No certificate
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 p-4 print:p-0">
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
                                    {data.courseName}
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
                                    {data.userName}
                                </p>
                                <p className="text-xs font-medium text-gray-800 mt-1">
                                    Course completed on {data.completionDate ?? "—"}
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

export default PublicCertificate;
