export enum JobStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    FILLED = 'FILLED',
    DRAFT = 'DRAFT'
}

export enum JobType {
    FULLTIME = 'FULLTIME',
    PARTTIME = 'PARTTIME',
    CONTRACT = 'CONTRACT',
    INTERNSHIP = 'INTERNSHIP'
}

export interface JobResponse {
    id: number;
    employerId: number;
    companyName: string;
    companyWebsite?: string;
    companyLogoUrl?: string;
    employerName?: string;
    title: string;
    description: string;
    requirements?: string;
    skillsRequired?: string;
    location: string;
    skills: string[];
    experienceYears?: number;
    minExperienceYears: number;
    maxExperienceYears: number;
    requiredEducationLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    minSalary: number;
    maxSalary: number;
    jobType: JobType;
    deadline: string;
    openings?: number;
    numberOfOpenings: number;
    status: JobStatus;
    viewCount?: number;
    viewsCount: number;
    applicationCount?: number;
    postedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobPostRequest {
    employerId: number;
    title: string;
    description: string;
    requirements?: string;
    skillsRequired?: string;
    location: string;
    salaryMin: number;
    salaryMax: number;
    jobType: JobType;
    experienceYears: number;
    openings: number;
    deadline: string;
    skills: string[];
}
