export interface UserProfileInfo {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    location?: string;
    currentEmploymentStatus?: string;
    role: string;
    // Employer-specific fields
    companyName?: string;
    industry?: string;
    companySize?: string;
    website?: string;
    description?: string;
}

export interface ResumeFile {
    id: number;
    fileName: string;
    fileType: string;
    uploadedAt?: string;
    uploadDate: string;
}

export interface ResumeResponse {
    id?: number;
    userId?: number;
    objective?: any;
    education?: any[];
    experience?: any[];
    skills?: any[];
    projects?: any[];
    certifications?: any[];
    files?: ResumeFile[];
    educationList: any[];
    experienceList: any[];
    skillsList: any[];
    projectsList: any[];
    certificationsList: any[];
    resumeFile?: ResumeFile;
}
