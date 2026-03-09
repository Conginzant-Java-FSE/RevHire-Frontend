export interface EmployerStats {
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  filledPositions: number;
}

export interface PlatformStats {
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  totalResumes: number;
  usersByRole: Record<string, number>;
  jobsByStatus: Record<string, number>;
  todayApplications: number;
}

export interface JobStats {
  totalJobs: number;
  openJobs: number;
  filledJobs: number;
  jobsByType: Record<string, number>;
  jobsByLocation: Record<string, number>;
  jobsByExperience: Record<string, number>;
}
