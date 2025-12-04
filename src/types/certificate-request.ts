import { CertificateRequestStatus } from "./general";

export interface CertificateRequest {
    id: string;
    userId: string;
    courseId: string;
    status: CertificateRequestStatus;
};
