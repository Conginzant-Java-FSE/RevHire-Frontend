import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';
import { ApplicationResponse, ApplicationStatus } from '../../../core/models/application.model';
import { JobResponse } from '../../../core/models/job.model';
import { ApiResponse } from '../../../core/models/api-response.model';
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
  searchQuery = '';
  selectedStatusFilter: ApplicationStatus | '' = '';
  selectedApplicationIds = new Set<number>();

  private route = inject(ActivatedRoute);
  private applicationService = inject(ApplicationService);
  private jobService = inject(JobService);
  private profileService = inject(ProfileService);
  private location = inject(Location);
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
        const notes = res.data || [];
        const listHtml = notes.length
          ? `<ul style="text-align:left;max-height:220px;overflow:auto;">${notes.map(n => `<li><strong>${new Date(n.createdAt).toLocaleString()}</strong><br/>${this.escapeHtml(n.note)}</li>`).join('')}</ul>`
          : '<p class="text-secondary">No notes yet.</p>';

        Swal.fire({
          title: `Internal Notes: ${app.seekerName}`,
          html: listHtml,
          showCancelButton: true,
          confirmButtonText: 'Add Note',
          cancelButtonText: 'Close'
        }).then(result => {
          if (!result.isConfirmed) return;

          Swal.fire({
            title: 'Add Internal Note',
            input: 'textarea',
            inputPlaceholder: 'Type hiring team note',
            showCancelButton: true,
            confirmButtonText: 'Save'
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
      width: '700px',
      background: bgColor,
      color: textColor,
      customClass: { popup: 'rounded-4 shadow-lg' }
    });
  }

  downloadResume(app: ApplicationResponse) {
    if (!app.resumeFileId) {
      Swal.fire('Not Found', 'This applicant has not uploaded a resume, or it was lost.', 'info');
      return;
    }

    this.profileService.downloadResumeFile(app.resumeFileId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Resume_' + app.seekerName.replace(/ /g, '_') + '.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: () => {
        Swal.fire('Error', 'Failed to download the resume file.', 'error');
      }
    });
  }

  goBack() {
    this.location.back();
  }

  private parseStructuredCover(cover: string) {
    let education = 'N/A';
    let experience = 'N/A';
    let skills = 'N/A';
    let projects = 'N/A';
    let actualCoverLetter = cover || 'No cover letter provided.';

    if (cover && cover.includes('Education:') && cover.includes('Experience:')) {
      try {
        const parts = cover.split('\n\nCover Letter: ');
        if (parts.length === 2) {
          actualCoverLetter = parts[1];
          const lines = parts[0].split('\n');
          education = lines.find(l => l.startsWith('Education:'))?.replace('Education: ', '').trim() || education;
          experience = lines.find(l => l.startsWith('Experience:'))?.replace('Experience: ', '').trim() || experience;
          skills = lines.find(l => l.startsWith('Skills:'))?.replace('Skills: ', '').trim() || skills;
          projects = lines.find(l => l.startsWith('Projects:'))?.replace('Projects: ', '').trim() || projects;
        }
      } catch {
        // keep defaults
      }
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
