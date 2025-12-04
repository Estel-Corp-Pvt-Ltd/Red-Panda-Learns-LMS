import { CertificateRequestStatus } from "./general";

export interface CertificateRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    courseId: string;
    courseName: string;
    status: CertificateRequestStatus;
};
