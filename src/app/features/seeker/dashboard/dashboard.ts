import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApplicationResponse, ApplicationStatus } from '../../../core/models/application.model';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/notification.model';
import { JobService } from '../../../core/services/job.service';
import { JobResponse, JobStatus } from '../../../core/models/job.model';
import { ProfileService } from '../../../core/services/profile.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import Swal from 'sweetalert2';

interface RecommendedJob {
  job: JobResponse;
  score: number;
  reasons: string[];
}

@Component({
  selector: 'app-seeker-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  applications: ApplicationResponse[] = [];
  isLoading = true;
  appStatusEnum = ApplicationStatus;

  notifications: Notification[] = [];
  unreadCount = 0;
  withdrawalReasons: string[] = [];

  recommendedJobs: RecommendedJob[] = [];
  isRecommendationLoading = true;

  activeApplicationsCount = 0;
  totalApplicationsCount = 0;
  todayApplicationsCount = 0;
  recentJobs: JobResponse[] = [];
  trendingJobs: JobResponse[] = [];
  engagementSummary = '';
  engagementShortlisted = 0;
  engagementRejected = 0;
  engagementTotalApps = 0;

  emailAlerts = true;
  pushAlerts = true;
  private notificationPollHandle: ReturnType<typeof setInterval> | null = null;
  private applicationPollHandle: ReturnType<typeof setInterval> | null = null;

  private applicationService = inject(ApplicationService);
  private notificationService = inject(NotificationService);
  private jobService = inject(JobService);
  private profileService = inject(ProfileService);
  private statisticsService = inject(StatisticsService);
  private authService = inject(AuthService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.loadAlertPreferences();
    this.loadApplications();
    this.loadNotifications();
    this.loadRecommendations();
    this.loadInsights();
    this.startNotificationPolling();
    this.startApplicationPolling();
  }

  ngOnDestroy() {
    if (this.notificationPollHandle) {
      clearInterval(this.notificationPollHandle);
      this.notificationPollHandle = null;
    }
    if (this.applicationPollHandle) {
      clearInterval(this.applicationPollHandle);
      this.applicationPollHandle = null;
    }
  }

  get appliedCount(): number {
    return this.applications.filter(a => a.status === ApplicationStatus.APPLIED).length;
  }

  get viewedCount(): number {
    return this.applications.filter(a => a.status === ApplicationStatus.UNDER_REVIEW).length;
  }

  get shortlistedCount(): number {
    return this.applications.filter(a => a.status === ApplicationStatus.SHORTLISTED).length;
  }

  get rejectedCount(): number {
    return this.applications.filter(a => a.status === ApplicationStatus.REJECTED).length;
  }

  loadApplications() {
    const seekerId = this.authService.currentUser()?.id;
    if (seekerId) {
      this.isLoading = true;
      this.applicationService.getApplicationsBySeeker(seekerId).subscribe({
        next: (res: ApiResponse<ApplicationResponse[]>) => {
          this.applications = (res as any).data || [];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  loadNotifications() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.notificationService.getUserNotifications(userId).subscribe({
      next: (items) => {
        this.notifications = items || [];
      }
    });

    this.notificationService.getUnreadCount(userId).subscribe({
      next: (count) => {
        this.unreadCount = count || 0;
      }
    });
  }

  markNotificationRead(item: Notification) {
    if (item.isRead) return;

    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  markAllNotificationsRead() {
    const userId = this.authService.currentUser()?.id;
    if (!userId || this.unreadCount === 0) return;

    this.notificationService.markAllAsRead(userId).subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
        this.unreadCount = 0;
      }
    });
  }

  loadRecommendations() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isRecommendationLoading = false;
      return;
    }

    this.isRecommendationLoading = true;

    forkJoin({
      profile: this.profileService.getCurrentProfile().pipe(catchError(() => of(null))),
      resume: this.profileService.getResume(userId).pipe(catchError(() => of(null))),
      jobs: this.jobService.getAllJobs().pipe(catchError(() => of(null)))
    }).subscribe(({ profile, resume, jobs }) => {
      const profileData: any = (profile as any)?.data || null;
      const resumeData: any = (resume as any)?.data || null;
      const allJobs: JobResponse[] = ((jobs as any)?.data || []).filter((j: JobResponse) => j.status === JobStatus.OPEN);

      const skillPool = this.extractSkills(resumeData?.skillsList);
      const location = String(profileData?.location || '').toLowerCase();

      this.recommendedJobs = allJobs
        .map(job => this.rankJob(job, skillPool, location))
        .filter(rec => rec.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      this.isRecommendationLoading = false;
    });
  }

  deleteNotification(item: Notification) {
    this.notificationService.deleteNotification(item.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== item.id);
        if (!item.isRead) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      }
    });
  }

  clearAllNotifications() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.notificationService.clearAllNotifications(userId).subscribe({
      next: () => {
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }

  markNotificationUnread(item: Notification) {
    if (!item.isRead) return;

    this.notificationService.markAsUnread(item.id).subscribe({
      next: () => {
        item.isRead = false;
        this.unreadCount += 1;
      }
    });
  }

  get groupedNotifications(): Array<{ label: string; items: Notification[] }> {
    if (!this.notifications.length) return [];

    const groups = new Map<string, Notification[]>();
    for (const note of this.notifications) {
      const key = (note.type || 'GENERAL').toUpperCase();
      const arr = groups.get(key) || [];
      arr.push(note);
      groups.set(key, arr);
    }

    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label: this.prettyKey(label),
        items: items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }

  loadInsights() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    forkJoin({
      activeApps: this.applicationService.getActiveApplications(userId).pipe(catchError(() => of(null))),
      totalApps: this.applicationService.getTotalCount().pipe(catchError(() => of(null))),
      todayApps: this.applicationService.getTodayCount().pipe(catchError(() => of(null))),
      recentJobs: this.jobService.getRecentJobs().pipe(catchError(() => of(null))),
      trendingJobs: this.jobService.getTrendingJobs().pipe(catchError(() => of(null))),
      engagement: this.statisticsService.getSeekerEngagement(userId).pipe(catchError(() => of(null)))
    }).subscribe(({ activeApps, totalApps, todayApps, recentJobs, trendingJobs, engagement }) => {
      this.activeApplicationsCount = ((activeApps as ApiResponse<ApplicationResponse[]>)?.data || []).length;
      this.totalApplicationsCount = (totalApps as ApiResponse<number>)?.data || 0;
      this.todayApplicationsCount = (todayApps as ApiResponse<number>)?.data || 0;

      this.recentJobs = ((recentJobs as ApiResponse<JobResponse[]>)?.data || []).slice(0, 4);
      this.trendingJobs = ((trendingJobs as ApiResponse<JobResponse[]>)?.data || []).slice(0, 4);

      const engagementData = (engagement as ApiResponse<Record<string, unknown>>)?.data || {};
      this.engagementShortlisted = Number(engagementData['shortlistedCount'] ?? 0);
      this.engagementRejected = Number(engagementData['rejectedCount'] ?? 0);
      this.engagementTotalApps = Number(engagementData['totalApplications'] ?? 0);
      this.engagementSummary = Object.entries(engagementData)
        .slice(0, 3)
        .map(([key, value]) => `${this.prettyKey(key)}: ${String(value)}`)
        .join(' | ');
    });
  }

  withdrawApplication(app: ApplicationResponse) {
    if (app.status === ApplicationStatus.WITHDRAWN || app.status === ApplicationStatus.REJECTED) return;
    this.applicationService.getWithdrawalReasons().subscribe({
      next: (reasonsRes) => {
        this.withdrawalReasons = (reasonsRes.data || []).map(item => item.reason).filter(Boolean);
        const optionsHtml = this.withdrawalReasons.length > 0
          ? `<option value="">Select reason</option>${this.withdrawalReasons.map(r => `<option value="${this.escapeHtml(r)}">${this.escapeHtml(r)}</option>`).join('')}`
          : `<option value="">Enter custom reason</option>`;

        Swal.fire({
          title: 'Withdraw Application',
          html: `
            <p class="text-start mb-2">Are you sure you want to withdraw your application for <strong>${this.escapeHtml(app.jobTitle)}</strong>?</p>
            <label class="form-label small text-start d-block">Reason</label>
            <select id="withdraw-reason" class="form-select mb-2">${optionsHtml}</select>
            <textarea id="withdraw-custom-reason" class="form-control" rows="3" placeholder="Add reason (optional)"></textarea>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, withdraw',
          confirmButtonColor: '#ef4444',
          preConfirm: () => {
            const selected = (document.getElementById('withdraw-reason') as HTMLSelectElement | null)?.value || '';
            const custom = (document.getElementById('withdraw-custom-reason') as HTMLTextAreaElement | null)?.value || '';
            return (selected || custom).trim();
          }
        }).then(result => {
          if (!result.isConfirmed) return;

          this.applicationService.withdrawApplication(app.id, result.value).subscribe({
            next: () => {
              Swal.fire('Withdrawn', 'Your application has been withdrawn.', 'success');
              app.status = ApplicationStatus.WITHDRAWN;
            },
            error: (err: any) => {
              Swal.fire('Error', err.error?.message || 'Failed to withdraw', 'error');
            }
          });
        });
      },
      error: () => {
        Swal.fire({
          title: 'Withdraw Application',
          text: `Are you sure you want to withdraw your application for ${app.jobTitle}?`,
          input: 'textarea',
          inputPlaceholder: 'Reason for withdrawal (optional)',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, withdraw',
          confirmButtonColor: '#ef4444'
        }).then(result => {
          if (!result.isConfirmed) return;
          this.applicationService.withdrawApplication(app.id, result.value).subscribe({
            next: () => {
              Swal.fire('Withdrawn', 'Your application has been withdrawn.', 'success');
              app.status = ApplicationStatus.WITHDRAWN;
            }
          });
        });
      }
    });
  }

  saveAlertPreferences() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    localStorage.setItem(`alerts_pref_${userId}`, JSON.stringify({ emailAlerts: this.emailAlerts, pushAlerts: this.pushAlerts }));
    Swal.fire({ icon: 'success', title: 'Saved', text: 'Alert preferences saved.', timer: 1200, showConfirmButton: false });
  }

  private extractSkills(list: unknown): string[] {
    if (!Array.isArray(list)) return [];

    return list
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const val = (item as any).name || (item as any).skill || (item as any).title;
          return val ? String(val) : '';
        }
        return '';
      })
      .filter(Boolean)
      .map(s => s.toLowerCase());
  }

  private rankJob(job: JobResponse, skills: string[], location: string): RecommendedJob {
    let score = 0;
    const reasons: string[] = [];

    const jobSkills = (job.skills || []).map(s => s.toLowerCase());
    const overlap = jobSkills.filter(skill => skills.includes(skill));

    if (overlap.length > 0) {
      const skillScore = Math.min(60, overlap.length * 20);
      score += skillScore;
      reasons.push(`Skill match: ${overlap.slice(0, 3).join(', ')}`);
    }

    if (location && job.location.toLowerCase().includes(location)) {
      score += 20;
      reasons.push('Location preference matched');
    }

    if (job.minExperienceYears <= 2) {
      score += 10;
      reasons.push('Good fit for early-to-mid experience');
    }

    if (job.createdAt) {
      const ageDays = (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 7) {
        score += 10;
        reasons.push('Recently posted');
      }
    }

    return { job, score: Math.min(100, score), reasons };
  }

  private loadAlertPreferences() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    const raw = localStorage.getItem(`alerts_pref_${userId}`);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      this.emailAlerts = data.emailAlerts ?? true;
      this.pushAlerts = data.pushAlerts ?? true;
    } catch {
      this.emailAlerts = true;
      this.pushAlerts = true;
    }
  }

  viewApplicationTimeline(app: ApplicationResponse) {
    this.applicationService.getStatusHistory(app.id).subscribe({
      next: (res) => {
        const history = (res.data || []).map(h => ({
          status: h.status || (h as any).newStatus || app.status,
          at: h.createdAt || (h as any).updatedAt || app.updatedAt || app.appliedAt
        }));

        const rows = history.length > 0
          ? history.map(item => `<li><strong>${String(item.status).replace('_', ' ')}</strong> <span class="text-secondary">(${new Date(item.at).toLocaleString()})</span></li>`).join('')
          : `<li><strong>${String(app.status).replace('_', ' ')}</strong> <span class="text-secondary">(${new Date(app.appliedAt).toLocaleString()})</span></li>`;

        Swal.fire({
          title: `Timeline: ${app.jobTitle}`,
          html: `<ul style="text-align:left;">${rows}</ul>`,
          width: 700
        });
      },
      error: () => {
        Swal.fire('Unavailable', 'Could not load timeline right now.', 'info');
      }
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

  private escapeHtml(raw: string): string {
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private startNotificationPolling() {
    this.notificationPollHandle = setInterval(() => {
      this.loadNotifications();
    }, 20000);
  }

  private startApplicationPolling() {
    // Refresh applications every 30 seconds so shortlist/status counts stay current
    this.applicationPollHandle = setInterval(() => {
      this.loadApplications();
    }, 30000);
  }
}
