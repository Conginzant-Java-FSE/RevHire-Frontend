export enum ApplicationStatus {
    APPLIED = 'APPLIED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    SHORTLISTED = 'SHORTLISTED',
    REJECTED = 'REJECTED',
    WITHDRAWN = 'WITHDRAWN'
}

export interface ApplicationResponse {
    id: number;
    jobId: number;
    jobTitle: string;
    companyName: string;
    location?: string;
    seekerId: number;
    seekerName: string;
    seekerEmail: string;
    status: ApplicationStatus;
    resumeFileId?: number;
    coverLetter?: string;
    notes?: string;
    appliedAt: string;
    updatedAt: string;
}

export interface ApplicationRequest {
    jobId: number;
    seekerId: number;
    resumeFileId?: number;
    coverLetter?: string;
}
