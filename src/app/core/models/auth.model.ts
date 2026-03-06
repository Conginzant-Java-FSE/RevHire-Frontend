export enum Role {
    JOB_SEEKER = 'JOB_SEEKER',
    EMPLOYER = 'EMPLOYER'
}

export interface AuthResponse {
    id: number;
    name: string;
    email: string;
    role: Role;
    token: string;
}

export interface LoginRequest {
    email: string;
    password?: string;
}

export interface RegistrationRequest {
    name: string;
    email: string;
    password?: string;
    role: Role;
    phone?: string;
    location?: string;

    
    companyName?: string;
    industry?: string;
    companySize?: string;
    description?: string;
    website?: string;

   
    currentStatus?: string;
    totalExperience?: number;

    securityQuestion?: string;
    securityAnswer?: string;
}
