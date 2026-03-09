import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Role } from '../../../core/models/auth.model';
import { JobPostRequest, JobResponse, JobStatus } from '../../../core/models/job.model';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ThemeService } from '../../../core/services/theme.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import { EmployerStats, JobStats } from '../../../core/models/statistics.model';
import Swal from 'sweetalert2';

type SeekerCard = {
  id: number;
  name: string;
  email: string;
  location?: string;
  totalExperience?: number;
  currentStatus?: string;
};

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  jobs: JobResponse[] = [];
  isLoading = true;
  jobStatusEnum = JobStatus;
  roleEnum = Role;
  employerStats: EmployerStats | null = null;
  jobAnalytics: JobStats | null = null;
  topLocationEntries: Array<[string, number]> = [];
  activitySummary = '';

  allSeekers: SeekerCard[] = [];
  filteredSeekers: SeekerCard[] = [];
  seekerSearchSkills = '';
  seekerSearchMinExp = '';
  seekerSearchMaxExp = '';
  isLoadingSeekers = false;
  hasSearched = false;

  private jobService = inject(JobService);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private statisticsService = inject(StatisticsService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.loadJobs();
    this.loadAllSeekers();
    this.loadDashboardAnalytics();
  }

  loadJobs() {
    const employerId = this.authService.currentUser()?.id;
    if (employerId) {
      this.isLoading = true;
      this.jobService.getJobsByEmployer(employerId).subscribe({
        next: (res: ApiResponse<JobResponse[]>) => {
          this.jobs = res.data || [];
          this.loadJobApplicationCounts();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  loadAllSeekers() {
    this.isLoadingSeekers = true;
    this.profileService.getAllSeekers().subscribe({
      next: (res) => {
        this.allSeekers = (res.data || []) as SeekerCard[];
        this.isLoadingSeekers = false;
      },
      error: () => {
        this.isLoadingSeekers = false;
      }
    });
  }

  searchSeekers() {
    this.hasSearched = true;
    const skillsQuery = this.seekerSearchSkills.toLowerCase().trim();
    const minExp = this.seekerSearchMinExp !== '' ? Number(this.seekerSearchMinExp) : null;
    const maxExp = this.seekerSearchMaxExp !== '' ? Number(this.seekerSearchMaxExp) : null;

    const localResults = this.filterSeekersLocally(this.allSeekers, skillsQuery, minExp, maxExp);
    if (!skillsQuery) {
      this.filteredSeekers = localResults;
      return;
    }

    this.profileService.searchResumesBySkill(skillsQuery).pipe(catchError(() => of(null))).subscribe((res) => {
      const fromResumeSearch = (((res as ApiResponse<Array<{ userId: number }>>) || null)?.data || []).map(s => s.userId);
      if (fromResumeSearch.length === 0) {
        this.filteredSeekers = localResults;
        return;
      }

      const resumeMatchedIds = new Set(fromResumeSearch);
      this.filteredSeekers = localResults.filter(s => resumeMatchedIds.has(s.id));
    });
  }

  clearSearch() {
    this.seekerSearchSkills = '';
    this.seekerSearchMinExp = '';
    this.seekerSearchMaxExp = '';
    this.filteredSeekers = [];
    this.hasSearched = false;
  }

  updateStatus(job: JobResponse, status: JobStatus) {
    if (!job.id) return;
    Swal.fire({
      title: 'Update Status?',
      text: `Change job status to ${status}?`,
      icon: 'question',
      showCancelButton: true
    }).then(result => {
      if (result.isConfirmed) {
        const request = status === JobStatus.CLOSED
          ? this.jobService.closeJob(job.id)
          : status === JobStatus.FILLED
            ? this.jobService.markJobAsFilled(job.id)
            : this.jobService.reopenJob(job.id);

        request.subscribe({
          next: () => {
            Swal.fire({
              icon: 'success', title: 'Updated!', text: 'Job status changed.', timer: 1500, showConfirmButton: false
            });
            job.status = status;
          }
        });
      }
    });
  }

  duplicateJob(job: JobResponse) {
    const employerId = this.authService.currentUser()?.id;
    if (!employerId) return;

    const payload: JobPostRequest = {
      employerId,
      title: `${job.title} (Copy)`,
      description: job.description,
      requirements: job.requirements || '',
      skillsRequired: job.skillsRequired || (job.skills || []).join(', '),
      location: job.location,
      salaryMin: job.minSalary,
      salaryMax: job.maxSalary,
      jobType: job.jobType,
      experienceYears: job.minExperienceYears || 0,
      openings: job.numberOfOpenings || 1,
      deadline: (job.deadline || new Date().toISOString()).slice(0, 10),
      skills: job.skills || []
    };

    this.jobService.postJob(payload).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Duplicated', text: 'Job was duplicated successfully.', timer: 1400, showConfirmButton: false });
        this.loadJobs();
      },
      error: (err) => {
        Swal.fire('Failed', err.error?.message || 'Could not duplicate job.', 'error');
      }
    });
  }

  deleteJob(job: JobResponse) {
    if (!job.id) return;
    Swal.fire({
      title: 'Delete this job?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#dc2626'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.jobService.deleteJob(job.id).subscribe({
        next: () => {
          this.jobs = this.jobs.filter(j => j.id !== job.id);
          Swal.fire({ icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false });
          this.loadDashboardAnalytics();
        },
        error: (err) => {
          Swal.fire('Failed', err.error?.message || 'Could not delete job.', 'error');
        }
      });
    });
  }

  private loadJobApplicationCounts() {
    if (this.jobs.length === 0) return;

    const calls = this.jobs.map(job =>
      this.jobService.getApplicationCount(job.id).pipe(catchError(() => of({ data: 0 } as ApiResponse<number>)))
    );

    forkJoin(calls).subscribe(results => {
      this.jobs = this.jobs.map((job, index) => ({
        ...job,
        applicationCount: results[index].data || 0
      }));
    });
  }

  private loadDashboardAnalytics() {
    const employerId = this.authService.currentUser()?.id;
    if (!employerId) return;

    forkJoin({
      employerStats: this.statisticsService.getEmployerStats(employerId).pipe(catchError(() => of(null))),
      analytics: this.statisticsService.getJobAnalytics().pipe(catchError(() => of(null))),
      activity: this.statisticsService.getEmployerActivity(employerId).pipe(catchError(() => of(null)))
    }).subscribe(({ employerStats, analytics, activity }) => {
      this.employerStats = (employerStats as ApiResponse<EmployerStats>)?.data || null;
      this.jobAnalytics = (analytics as ApiResponse<JobStats>)?.data || null;

      this.topLocationEntries = Object.entries(this.jobAnalytics?.jobsByLocation || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const activityData = (activity as ApiResponse<Record<string, unknown>>)?.data || {};
      this.activitySummary = Object.entries(activityData)
        .slice(0, 3)
        .map(([k, v]) => `${this.prettyKey(k)}: ${String(v)}`)
        .join(' | ');
    });
  }

  private filterSeekersLocally(
    seekers: SeekerCard[],
    skillsQuery: string,
    minExp: number | null,
    maxExp: number | null
  ) {
    return seekers.filter(seeker => {
      const matchesSkills = skillsQuery
        ? (seeker.name?.toLowerCase().includes(skillsQuery) ||
          seeker.currentStatus?.toLowerCase().includes(skillsQuery))
        : true;

      const exp = seeker.totalExperience ?? 0;
      const matchesMin = minExp !== null ? exp >= minExp : true;
      const matchesMax = maxExp !== null ? exp <= maxExp : true;

      return matchesSkills && matchesMin && matchesMax;
    });
  }

  private prettyKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, c => c.toUpperCase());
  }
}
