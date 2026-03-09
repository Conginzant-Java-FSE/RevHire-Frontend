import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';
import { ApplicationResponse, ApplicationStatus } from '../../../core/models/application.model';
import { JobResponse } from '../../../core/models/job.model';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Role } from '../../../core/models/auth.model';
import { ThemeService } from '../../../core/services/theme.service';
import { ProfileService } from '../../../core/services/profile.service';
import Swal from 'sweetalert2';

type NoteItem = { id: number; note: string; createdAt: string };

@Component({
  selector: 'app-job-applicants',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './job-applicants.component.html'
})
export class JobApplicantsComponent implements OnInit {
  applications: ApplicationResponse[] = [];
  filteredApplications: ApplicationResponse[] = [];
  job: JobResponse | null = null;
  isLoading = true;
  appStatusEnum = ApplicationStatus;
  roleEnum = Role;
  searchQuery = '';
  selectedStatusFilter: ApplicationStatus | '' = '';
  selectedApplicationIds = new Set<number>();

  private route = inject(ActivatedRoute);
  private applicationService = inject(ApplicationService);
  private jobService = inject(JobService);
  private profileService = inject(ProfileService);
  private location = inject(Location);
  private router = inject(Router);
  themeService = inject(ThemeService);

  ngOnInit() {
    const jobId = Number(this.route.snapshot.paramMap.get('id'));
    if (jobId) {
      this.loadJobDetails(jobId);
      this.loadApplicants(jobId);
    }
  }

  get selectedCount(): number {
    return this.selectedApplicationIds.size;
  }

  get allFilteredSelected(): boolean {
    return this.filteredApplications.length > 0 && this.filteredApplications.every(a => this.selectedApplicationIds.has(a.id));
  }

  loadJobDetails(jobId: number) {
    this.jobService.getJobById(jobId).subscribe((res: ApiResponse<JobResponse>) => {
      this.job = res.data || null;
    });
  }

  loadApplicants(jobId: number) {
    this.isLoading = true;
    this.applicationService.getApplicationsByJob(jobId).subscribe({
      next: (res: ApiResponse<ApplicationResponse[]>) => {
        this.applications = res.data || [];
        this.filteredApplications = [...this.applications];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  toggleSelection(appId: number) {
    if (this.selectedApplicationIds.has(appId)) {
      this.selectedApplicationIds.delete(appId);
    } else {
      this.selectedApplicationIds.add(appId);
    }
  }

  toggleSelectAllFiltered() {
    if (this.allFilteredSelected) {
      this.filteredApplications.forEach(app => this.selectedApplicationIds.delete(app.id));
      return;
    }

    this.filteredApplications.forEach(app => {
      if (app.status !== ApplicationStatus.WITHDRAWN) {
        this.selectedApplicationIds.add(app.id);
      }
    });
  }

  updateStatus(app: ApplicationResponse, newStatus: ApplicationStatus) {
    this.applicationService.updateApplicationStatus(app.id, newStatus).subscribe({
      next: () => {
        app.status = newStatus;
        Swal.fire({
          icon: 'success', title: 'Status Updated', text: `Applicant is now ${newStatus.replace('_', ' ')}`, timer: 1500, showConfirmButton: false
        });
      }
    });
  }

  bulkUpdateStatus(status: ApplicationStatus) {
    const ids = Array.from(this.selectedApplicationIds);
    if (ids.length === 0) {
      Swal.fire('No Selection', 'Select applicants first.', 'info');
      return;
    }

    this.applicationService.bulkUpdateStatus(ids, status).subscribe({
      next: () => {
        this.applications = this.applications.map(app => ids.includes(app.id) ? { ...app, status } : app);
        this.filterApplicants();
        this.selectedApplicationIds.clear();
        Swal.fire({ icon: 'success', title: 'Bulk update complete', timer: 1200, showConfirmButton: false });
      },
      error: (err) => {
        Swal.fire('Failed', err.error?.message || 'Bulk update failed.', 'error');
      }
    });
  }

  filterApplicants() {
    const jobId = this.job?.id;
    if (!jobId) return;

    if (!this.searchQuery.trim()) {
      if (this.selectedStatusFilter) {
        this.applicationService.getApplicationsByJobAndStatus(jobId, this.selectedStatusFilter).subscribe({
          next: (res) => {
            this.filteredApplications = res.data || [];
          },
          error: () => {
            this.filteredApplications = this.applications.filter(a => a.status === this.selectedStatusFilter);
          }
        });
      } else {
        this.filteredApplications = [...this.applications];
      }
      return;
    }

    this.applicationService.searchApplications(this.searchQuery.trim()).subscribe({
      next: (res) => {
        const results = (res.data || []).filter(app => app.jobId === jobId);
        const statusFiltered = this.selectedStatusFilter
          ? results.filter(app => app.status === this.selectedStatusFilter)
          : results;
        this.filteredApplications = statusFiltered;
      },
      error: () => {
        const query = this.searchQuery.toLowerCase().trim();
        const local = this.applications.filter(app =>
          (app.seekerName && app.seekerName.toLowerCase().includes(query)) ||
          (app.seekerEmail && app.seekerEmail.toLowerCase().includes(query)) ||
          (app.coverLetter && app.coverLetter.toLowerCase().includes(query))
        );
        this.filteredApplications = this.selectedStatusFilter
          ? local.filter(app => app.status === this.selectedStatusFilter)
          : local;
      }
    });
  }

  manageNotes(app: ApplicationResponse) {
    this.applicationService.getNotes(app.id).subscribe({
      next: (res) => {
        const isDark = this.themeService.isDarkMode();
        const notes = res.data || [];
        const mutedColor = isDark ? '#94a3b8' : '#6b7280';
        const listHtml = notes.length
          ? `<ul style="text-align:left;max-height:220px;overflow:auto;">${notes.map(n => `<li><strong>${new Date(n.createdAt).toLocaleString()}</strong><br/>${this.escapeHtml(n.note)}</li>`).join('')}</ul>`
          : `<p style="color:${mutedColor};margin:0;">No notes yet.</p>`;

        Swal.fire({
          title: `Internal Notes: ${app.seekerName}`,
          html: listHtml,
          showCancelButton: true,
          confirmButtonText: 'Add Note',
          cancelButtonText: 'Close',
          confirmButtonColor: '#2563eb',
          background: isDark ? '#0f1c2d' : '#ffffff',
          color: isDark ? '#e2e8f0' : '#1f2937'
        }).then(result => {
          if (!result.isConfirmed) return;

          Swal.fire({
            title: 'Add Internal Note',
            input: 'textarea',
            inputPlaceholder: 'Type hiring team note',
            showCancelButton: true,
            confirmButtonText: 'Save',
            confirmButtonColor: '#2563eb',
            background: isDark ? '#0f1c2d' : '#ffffff',
            color: isDark ? '#e2e8f0' : '#1f2937',
            inputAttributes: isDark
              ? { style: 'background:#0b1220;color:#e2e8f0;border:1px solid #334155;' }
              : undefined
          }).then(noteResult => {
            const noteText = (noteResult.value || '').trim();
            if (!noteResult.isConfirmed || !noteText) return;

            this.applicationService.addNote(app.id, noteText).subscribe({
              next: () => {
                Swal.fire({ icon: 'success', title: 'Note added', timer: 1000, showConfirmButton: false });
              }
            });
          });
        });
      }
    });
  }

  exportApplicantsCsv() {
    const rows = this.filteredApplications.map(app => {
      const parsed = this.parseStructuredCover(app.coverLetter || '');
      return {
        name: app.seekerName,
        email: app.seekerEmail,
        status: app.status,
        appliedAt: app.appliedAt,
        education: parsed.education,
        experience: parsed.experience,
        skills: parsed.skills,
        projects: parsed.projects
      };
    });

    const headers = ['Name', 'Email', 'Status', 'Applied At', 'Education', 'Experience', 'Skills', 'Projects'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [r.name, r.email, r.status, r.appliedAt, r.education, r.experience, r.skills, r.projects]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applicants_job_${this.job?.id || 'export'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  compareSelectedCandidates() {
    const ids = Array.from(this.selectedApplicationIds);
    if (ids.length !== 2) {
      Swal.fire('Select 2 candidates', 'Choose exactly two applicants for comparison.', 'info');
      return;
    }

    const selected = this.applications.filter(a => ids.includes(a.id));
    const [a, b] = selected;
    const pa = this.parseStructuredCover(a.coverLetter || '');
    const pb = this.parseStructuredCover(b.coverLetter || '');

    const html = `
      <div style="overflow:auto;">
        <table class="table table-sm">
          <thead><tr><th>Field</th><th>${this.escapeHtml(a.seekerName)}</th><th>${this.escapeHtml(b.seekerName)}</th></tr></thead>
          <tbody>
            <tr><td>Status</td><td>${a.status}</td><td>${b.status}</td></tr>
            <tr><td>Education</td><td>${this.escapeHtml(pa.education)}</td><td>${this.escapeHtml(pb.education)}</td></tr>
            <tr><td>Experience</td><td>${this.escapeHtml(pa.experience)}</td><td>${this.escapeHtml(pb.experience)}</td></tr>
            <tr><td>Skills</td><td>${this.escapeHtml(pa.skills)}</td><td>${this.escapeHtml(pb.skills)}</td></tr>
            <tr><td>Projects</td><td>${this.escapeHtml(pa.projects)}</td><td>${this.escapeHtml(pb.projects)}</td></tr>
          </tbody>
        </table>
      </div>
    `;

    Swal.fire({ title: 'Candidate Comparison', html, width: 900 });
  }

  viewCoverLetter(app: ApplicationResponse) {
    const parsed = this.parseStructuredCover(app.coverLetter || '');
    const actualCoverLetter = parsed.actualCoverLetter || 'No cover letter provided.';

    const isDark = this.themeService.isDarkMode();
    const bgColor = isDark ? '#1e293b' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#212529';
    const borderColor = isDark ? '#334155' : '#dee2e6';

    const htmlContent = `
        <div class="text-start mt-4" style="color: ${textColor}">
          <div class="row mb-4 pb-3" style="border-bottom: 1px solid ${borderColor}">
             <div class="col-6"><h6 class="text-secondary fw-bold text-uppercase mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">Education Level</h6><div class="fw-medium">${this.escapeHtml(parsed.education)}</div></div>
             <div class="col-6"><h6 class="text-secondary fw-bold text-uppercase mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">Experience</h6><div class="fw-medium">${this.escapeHtml(parsed.experience)}</div></div>
          </div>
          <div class="mb-4 pb-3" style="border-bottom: 1px solid ${borderColor}"><h6 class="text-secondary fw-bold text-uppercase mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">Skills</h6><div class="fw-medium">${this.escapeHtml(parsed.skills)}</div></div>
          <div class="mb-4 pb-3" style="border-bottom: 1px solid ${borderColor}"><h6 class="text-secondary fw-bold text-uppercase mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">Internships / Projects</h6><div class="fw-medium" style="white-space: pre-wrap;">${this.escapeHtml(parsed.projects)}</div></div>
          <div>
             <h6 class="text-secondary fw-bold text-uppercase mb-3" style="font-size: 0.75rem; letter-spacing: 0.5px;">Cover Letter</h6>
             <div class="p-3 rounded bg-opacity-10" style="background-color: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6;">${this.escapeHtml(actualCoverLetter)}</div>
          </div>
        </div>
    `;

    Swal.fire({
      title: 'Applicant Details',
      html: htmlContent,
      confirmButtonText: 'Close',
      showDenyButton: true,
      denyButtonText: 'Message Applicant',
      denyButtonColor: '#2563eb',
      confirmButtonColor: '#64748b',
      width: '700px',
      background: bgColor,
      color: textColor,
      customClass: { popup: 'rounded-4 shadow-lg' }
    }).then(result => {
      if (result.isDenied) {
        this.openChatWithApplicant(app);
      }
    });
  }

  downloadResume(app: ApplicationResponse) {
    if (!app.resumeFileId) {
      this.tryOpenLatestResumeFile(app);
      return;
    }

    this.openResumeByFileId(app.resumeFileId, app, true);
  }

  private openResumeByFileId(fileId: number, app: ApplicationResponse, allowFallback: boolean) {
    this.profileService.downloadResumeFile(fileId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const isPdf = (blob.type || '').toLowerCase().includes('pdf');
        const fileName = 'Resume_' + app.seekerName.replace(/ /g, '_') + (isPdf ? '.pdf' : '');

        if (!isPdf) {
          this.triggerResumeDownload(url, fileName);
          return;
        }

        const isDark = this.themeService.isDarkMode();
        Swal.fire({
          title: `Resume: ${app.seekerName}`,
          html: `<iframe src="${url}" style="width:100%;height:70vh;border:0;border-radius:12px;background:#fff;" title="Resume Preview"></iframe>`,
          width: '90vw',
          showCancelButton: true,
          showDenyButton: true,
          denyButtonText: 'Download',
          cancelButtonText: 'Close',
          confirmButtonText: 'Open in New Tab',
          background: isDark ? '#0f1c2d' : '#ffffff',
          color: isDark ? '#e2e8f0' : '#1f2937'
        }).then(result => {
          if (result.isDenied) {
            this.triggerResumeDownload(url, fileName);
          } else if (result.isConfirmed) {
            window.open(url, '_blank', 'noopener');
          }
          window.URL.revokeObjectURL(url);
        });
      },
      error: () => {
        if (allowFallback) {
          this.tryOpenLatestResumeFile(app);
          return;
        }
        Swal.fire('Error', 'Failed to download the resume file.', 'error');
      }
    });
  }

  private tryOpenLatestResumeFile(app: ApplicationResponse) {
    this.profileService.getResume(app.seekerId).subscribe({
      next: (res: ApiResponse<any>) => {
        const files = res?.data?.files || [];
        if (!Array.isArray(files) || files.length === 0) {
          Swal.fire('Not Found', 'This applicant has not uploaded a resume, or it was lost.', 'info');
          return;
        }

        const latest = files[files.length - 1];
        const latestFileId = Number(latest?.id);
        if (!latestFileId) {
          Swal.fire('Error', 'Resume file is not available for preview.', 'error');
          return;
        }

        this.openResumeByFileId(latestFileId, app, false);
      },
      error: () => {
        Swal.fire('Error', 'Failed to fetch applicant resume details.', 'error');
      }
    });
  }

  private triggerResumeDownload(url: string, fileName: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  goBack() {
    this.location.back();
  }

  openChatWithApplicant(app: ApplicationResponse) {
    this.router.navigate(['/chat'], {
      queryParams: {
        partnerId: app.seekerId,
        partnerName: app.seekerName,
        partnerRole: this.roleEnum.JOB_SEEKER
      }
    });
  }

  private parseStructuredCover(cover: string) {
    let education = 'N/A';
    let experience = 'N/A';
    let skills = 'N/A';
    let projects = 'N/A';
    let actualCoverLetter = cover || 'No cover letter provided.';

    if (!cover) {
      return { education, experience, skills, projects, actualCoverLetter };
    }

    try {
      const lines = cover.split('\n').map(l => l.trim()).filter(Boolean);
      const byPrefix = (prefix: string) => lines.find(l => l.startsWith(prefix))?.replace(prefix, '').trim();

      education = byPrefix('Education: ') || education;
      experience = byPrefix('Experience: ') || experience;
      skills = byPrefix('Skills: ') || skills;
      projects = byPrefix('Projects: ') || projects;

      const coverMarker = '\n\nCover Letter: ';
      if (cover.includes(coverMarker)) {
        const parts = cover.split(coverMarker);
        actualCoverLetter = parts[1]?.trim() || actualCoverLetter;
      } else {
        const nonStructured = lines.filter(l =>
          !l.startsWith('Objective: ') &&
          !l.startsWith('Education: ') &&
          !l.startsWith('Experience: ') &&
          !l.startsWith('Skills: ') &&
          !l.startsWith('Projects: ') &&
          !l.startsWith('Certifications: ') &&
          !l.startsWith('Applied via ')
        );
        if (nonStructured.length > 0) {
          actualCoverLetter = nonStructured.join('\n');
        } else {
          actualCoverLetter = 'No cover letter provided.';
        }
      }
    } catch {
      // keep defaults
    }

    return { education, experience, skills, projects, actualCoverLetter };
  }

  private escapeHtml(raw: string) {
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
