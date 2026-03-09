import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { JobResponse, JobStatus } from '../../../core/models/job.model';
import { Role } from '../../../core/models/auth.model';
import { ApplicationStatus } from '../../../core/models/application.model';
import { ThemeService } from '../../../core/services/theme.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css'
})
export class JobDetailComponent implements OnInit {
  job: JobResponse | null = null;
  isLoading = true;
  isApplying = false;
  hasApplied = false;
  existingApplicationId: number | null = null;
  isWithdrawing = false;
  isOneClickApplying = false;
  roleEnum = Role;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private jobService = inject(JobService);
  private applicationService = inject(ApplicationService);
  private profileService = inject(ProfileService);
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  ngOnInit() {
    const jobId = Number(this.route.snapshot.paramMap.get('id'));
    if (jobId) {
      this.loadJob(jobId);
    } else {
      this.goBack();
    }
  }

  loadJob(id: number) {
    this.jobService.getJobById(id).subscribe({
      next: (res) => {
        this.job = res.data;
        this.isLoading = false;
        this.checkIfApplied();
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Error', 'Failed to load job details', 'error').then(() => this.goBack());
      }
    });
  }

  checkIfApplied() {
    if (this.authService.isJobSeeker() && this.job) {
      const userId = this.authService.currentUser()?.id;
      if (userId) {
        this.applicationService.getApplicationsBySeeker(userId).subscribe(res => {
          const apps = (res as any).data || [];
          const existing = apps.find((a: any) => a.jobId === this.job?.id);
          const activeStatuses = [ApplicationStatus.APPLIED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SHORTLISTED];
          this.hasApplied = !!existing && activeStatuses.includes(existing.status);
          this.existingApplicationId = this.hasApplied ? (existing?.id ?? null) : null;
        });
      }
    }
  }

  withdrawApplication() {
    if (!this.existingApplicationId) return;
    Swal.fire({
      title: 'Withdraw Application?',
      text: 'Are you sure you want to withdraw your application for this job?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Withdraw',
      confirmButtonColor: '#dc3545'
    }).then(result => {
      if (result.isConfirmed) {
        this.isWithdrawing = true;
        this.applicationService.withdrawApplication(this.existingApplicationId!).subscribe({
          next: () => {
            this.hasApplied = false;
            this.existingApplicationId = null;
            this.isWithdrawing = false;
            Swal.fire({ icon: 'success', title: 'Withdrawn', text: 'You can now apply again.', timer: 1500, showConfirmButton: false });
          },
          error: (err) => {
            this.isWithdrawing = false;
            Swal.fire('Error', err.error?.message || 'Failed to withdraw application.', 'error');
          }
        });
      }
    });
  }

  oneClickApply() {
    if (!this.authService.isAuthenticated()) {
      Swal.fire('Sign in to Apply', 'You need an account to apply for a job.', 'info').then(() =>
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } })
      );
      return;
    }
    if (!this.authService.isJobSeeker()) {
      Swal.fire('Not Allowed', 'Only Job Seekers can apply for jobs.', 'error');
      return;
    }
    if (!this.job || this.job.status !== JobStatus.OPEN) {
      Swal.fire('Not Available', 'This job is no longer accepting applications.', 'warning');
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.isOneClickApplying = true;

    this.profileService.getResume(userId).subscribe({
      next: (resumeRes: any) => {
        const resume = resumeRes.data || {};
        const builderData = this.getResumeBuilderDraft(userId);
        const hasBuilderDraft = !!builderData;

        // Use normalized field names (profile service normalizes these)
        const skills = this.extractSkillNames(resume.skillsList || resume.skills) || this.extractBuilderSkills(builderData);
        const educationFromResume = this.extractTopEducation(resume.educationList || resume.education);
        const education = educationFromResume === 'Not specified'
          ? (this.extractBuilderEducation(builderData) || educationFromResume)
          : educationFromResume;
        const experienceFromResume = this.extractExperienceSummary(resume.experienceList || resume.experience);
        const experience = experienceFromResume === 'No experience listed'
          ? (this.extractBuilderExperience(builderData) || experienceFromResume)
          : experienceFromResume;
        const objective = resume.objective?.objectiveStatement || builderData?.summary || '';
        const projects = this.extractProjects(resume.projectsList || resume.projects) || this.extractBuilderProjects(builderData);
        const certifications = this.extractCertifications(resume.certificationsList || resume.certifications) || this.extractBuilderCertifications(builderData);

        // Get the most recently uploaded PDF resume file
        const files: any[] = resume.files || [];
        const latestFile = files.length > 0 ? files[files.length - 1] : null;
        const resumeFileId: number | null = latestFile?.id ?? null;

        // Build ATS cover letter
        const coverLetter = [
          objective ? `Objective: ${objective}` : '',
          `Education: ${education || 'Not specified'}`,
          `Experience: ${experience || 'No experience listed'}`,
          `Skills: ${skills || 'Not specified'}`,
          projects ? `Projects: ${projects}` : '',
          certifications ? `Certifications: ${certifications}` : '',
          `Resume Builder Draft: ${hasBuilderDraft ? 'Present' : 'Absent'}`,
          `Applied via One-Click using ATS profile.`
        ].filter(Boolean).join('\n');

        const fileSection = latestFile
          ? `<div class="d-flex align-items-center gap-2 p-2 rounded mb-3" style="background:#e8f5e9;border:1px solid #a5d6a7;">
               <span style="font-size:1.4rem;">File</span>
               <div>
                 <div class="fw-semibold small text-success">${this.escapeHtml(latestFile.fileName || 'resume.pdf')}</div>
                 <div class="small text-secondary">${latestFile.fileType || 'PDF'} | Resume on file</div>
               </div>
             </div>`
          : `<div class="alert alert-warning small mb-3 py-2">No resume file uploaded. Application will use ATS data only.</div>`;

        const eduList: any[] = resume.educationList || resume.education || [];
        const expList: any[] = resume.experienceList || resume.experience || [];
        const hasResumeContent = !!latestFile || !!objective || !!skills || eduList.length > 0 || expList.length > 0
          || !!projects || !!certifications || hasBuilderDraft;

        if (!hasResumeContent) {
          this.isOneClickApplying = false;
          Swal.fire(
            'Resume Required',
            'Please upload a resume or create your resume in Resume Builder before applying.',
            'warning'
          );
          return;
        }

        const eduHtml = eduList.length > 0
          ? `<div class="mb-2"><span class="fw-semibold">Education:</span><ul class="mb-0 mt-1 ps-3">${eduList.map((e: any) => `<li>${this.escapeHtml(e?.degree || '?')} | ${this.escapeHtml(e?.institution || '')} ${e?.year ? `(${e.year})` : ''} ${e?.cgpa ? `| CGPA: ${e.cgpa}` : ''}</li>`).join('')}</ul></div>`
          : '';

        const expHtml = expList.length > 0
          ? `<div class="mb-2"><span class="fw-semibold">Experience:</span><ul class="mb-0 mt-1 ps-3">${expList.map((e: any) => `<li><strong>${this.escapeHtml(e?.jobTitle || '?')}</strong> at ${this.escapeHtml(e?.company || '?')} ${e?.duration ? `(${e.duration})` : ''}</li>`).join('')}</ul></div>`
          : '';

        const skillsHtml = skills
          ? `<div class="mb-2"><span class="fw-semibold">Skills:</span><div class="mt-1">${skills.split(', ').map(s => `<span class="badge text-bg-secondary me-1 mb-1">${this.escapeHtml(s)}</span>`).join('')}</div></div>`
          : '';

        const noDataMsg = !eduList.length && !expList.length && !skills
          ? `<div class="alert alert-info small py-2 mb-2">Your resume builder profile has no data yet. Please fill it in the <strong>Resume Builder</strong> first.</div>`
          : '';

        Swal.fire({
          title: 'One-Click Apply',
          width: 600,
          html: `
            <div class="text-start" style="font-size:0.88rem;">
              ${fileSection}
              ${noDataMsg}
              ${objective ? `<div class="mb-2"><span class="fw-semibold">Objective:</span> <span class="text-secondary">${this.escapeHtml(objective)}</span></div>` : ''}
              ${eduHtml}
              ${expHtml}
              ${skillsHtml}
              ${projects ? `<div class="mb-2"><span class="fw-semibold">Projects:</span> <span class="text-secondary">${this.escapeHtml(projects)}</span></div>` : ''}
              ${certifications ? `<div class="mb-2"><span class="fw-semibold">Certifications:</span> <span class="text-secondary">${this.escapeHtml(certifications)}</span></div>` : ''}
              <p class="text-secondary small mb-0 mt-2" style="font-size:0.8rem;">Click <strong>Apply Now</strong> to submit instantly using your ATS profile.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Apply Now',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#198754'
        }).then(result => {
          this.isOneClickApplying = false;
          if (!result.isConfirmed) return;


          this.isApplying = true;
          this.applicationService.applyForJob({
            jobId: this.job!.id,
            seekerId: userId,
            resumeFileId: resumeFileId ?? undefined,
            coverLetter
          }).subscribe({
            next: () => {
              this.isApplying = false;
              this.hasApplied = true;
              Swal.fire({ icon: 'success', title: 'Applied!', text: 'Application submitted using your ATS profile.', timer: 2000, showConfirmButton: false });
            },
            error: (err: any) => {
              this.isApplying = false;
              Swal.fire('Error', err.error?.message || 'Application failed.', 'error');
            }
          });
        });
      },
      error: () => {
        this.isOneClickApplying = false;
        Swal.fire('No ATS Resume Found', 'Please build your ATS resume in the Resume Builder before using One-Click Apply.', 'warning');
      }
    });
  }


  applyNow() {
    if (!this.authService.isAuthenticated()) {
      Swal.fire({
        title: 'Sign in to Apply',
        text: 'You need an account to apply for a job.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Sign In',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
        }
      });
      return;
    }

    if (!this.authService.isJobSeeker()) {
      Swal.fire('Not Allowed', 'Only Job Seekers can apply for jobs.', 'error');
      return;
    }

    if (!this.job || this.job.status !== JobStatus.OPEN) {
      Swal.fire('Not Available', 'This job is no longer accepting applications.', 'warning');
      return;
    }

    const userName = this.authService.currentUser()?.name || '';
    const userEmail = this.authService.currentUser()?.email || '';
    const isDark = this.themeService.isDarkMode();
    const inputClass = isDark ? 'form-control bg-dark text-white border-secondary' : 'form-control bg-light';
    const userId = this.authService.currentUser()?.id;

    const resumeDataPromise = userId
      ? new Promise<string>(resolve => {
        this.profileService.getResume(userId).subscribe({
          next: (res: any) => {
            const resume = res.data || {};
            const skills = this.extractSkillNames(resume.skills);
            const edu = this.extractTopEducation(resume.education);
            const exp = this.extractExperienceSummary(resume.experience);
            resolve(skills ? `Skills: ${skills}\nEducation: ${edu}\nExperience: ${exp}` : '');
          },
          error: () => resolve('')
        });
      })
      : Promise.resolve('');

    resumeDataPromise.then(atsSnippet => {
      Swal.fire({
        title: 'Apply for ' + this.job!.title,
        html: `
          <div class="text-start mt-3">
            ${atsSnippet ? `<div class="alert alert-info p-2 small mb-3" style="text-align:left;white-space:pre-line;"><strong>Your ATS Profile:</strong>\n${atsSnippet}</div>` : ''}
            <div class="mb-3">
              <label class="form-label small fw-medium text-secondary">Full Name</label>
              <input type="text" class="${inputClass}" value="${userName}" readonly>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium text-secondary">Email Address</label>
              <input type="email" class="${inputClass}" value="${userEmail}" readonly>
            </div>
            <div class="row">
              <div class="col-6 mb-3">
                <label class="form-label small fw-medium text-secondary">Education <span class="text-danger">*</span></label>
                <select id="swal-apply-edu" class="${isDark ? 'form-select bg-dark text-white border-secondary' : 'form-select'}">
                  <option value="">Select...</option>
                  <option value="High School">High School</option>
                  <option value="Associate Degree">Associate Degree</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
              <div class="col-6 mb-3">
                <label class="form-label small fw-medium text-secondary">Experience (Yrs) <span class="text-danger">*</span></label>
                <input type="number" id="swal-apply-exp" class="${inputClass}" min="0" placeholder="e.g. 3">
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium text-secondary">Skills <span class="text-danger">*</span></label>
              <input type="text" id="swal-apply-skills" class="${inputClass}" placeholder="e.g. Java, Angular, SQL">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium text-secondary">Internships or Projects</label>
              <textarea id="swal-apply-projects" class="${isDark ? 'form-control bg-dark text-white border-secondary' : 'form-control'}" rows="2" placeholder="Describe briefly, or leave blank if NA"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium text-secondary">Upload Resume <span class="text-danger">*</span></label>
              <input id="swal-apply-resume" type="file" class="${isDark ? 'form-control bg-dark text-white border-secondary' : 'form-control'}" accept=".pdf,.doc,.docx">
              <div class="form-text mt-1 text-secondary" style="font-size: 0.75rem;">Only PDF, DOC, or DOCX allowed.</div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium text-secondary">Cover Letter (Optional)</label>
              <textarea id="swal-apply-cover" class="${isDark ? 'form-control bg-dark text-white border-secondary' : 'form-control'}" rows="3" placeholder="Why are you a great fit?"></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Submit Application',
        showLoaderOnConfirm: true,
        preConfirm: () => {
          const eduInput = document.getElementById('swal-apply-edu') as HTMLSelectElement;
          const expInput = document.getElementById('swal-apply-exp') as HTMLInputElement;
          const skillsInput = document.getElementById('swal-apply-skills') as HTMLInputElement;
          const projectsInput = document.getElementById('swal-apply-projects') as HTMLTextAreaElement;
          const coverInput = document.getElementById('swal-apply-cover') as HTMLTextAreaElement;
          const resumeInput = document.getElementById('swal-apply-resume') as HTMLInputElement;

          if (!eduInput.value) { Swal.showValidationMessage('Please select your highest education.'); return false; }
          if (!expInput.value) { Swal.showValidationMessage('Please enter your years of experience.'); return false; }
          if (!skillsInput.value.trim()) { Swal.showValidationMessage('Please enter your skills.'); return false; }
          if (!resumeInput.files || resumeInput.files.length === 0) { Swal.showValidationMessage('Please upload your resume to apply.'); return false; }

          const seekerId = this.authService.currentUser()?.id || 0;
          const combinedCoverLetter = `Education: ${eduInput.value}\nExperience: ${expInput.value} years\nSkills: ${skillsInput.value.trim()}\nProjects: ${projectsInput?.value.trim() || 'NA'}\n\nCover Letter: ${coverInput?.value.trim() || 'N/A'}`;

          this.isApplying = true;
          return new Promise((resolve) => {
            this.profileService.uploadResumeFile(seekerId, resumeInput.files![0]).subscribe({
              next: (uploadRes: any) => {
                const resumeFileId = uploadRes.data?.id;
                if (!resumeFileId) { this.isApplying = false; Swal.showValidationMessage('Failed to retrieve uploaded resume ID.'); resolve(null); return; }
                this.applicationService.applyForJob({ jobId: this.job!.id, seekerId, resumeFileId, coverLetter: combinedCoverLetter }).subscribe({
                  next: (res) => { this.isApplying = false; this.hasApplied = true; resolve(res); },
                  error: (err) => { this.isApplying = false; Swal.showValidationMessage(`Application failed: ${err.error?.message || 'Unknown error'}`); resolve(null); }
                });
              },
              error: (err) => { this.isApplying = false; Swal.showValidationMessage(`Upload failed: ${err.error?.message || 'Unknown error'}`); resolve(null); }
            });
          });
        },
        allowOutsideClick: () => !Swal.isLoading()
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire('Success', 'Your application has been submitted!', 'success');
        }
      });
    });
  }

  goBack() {
    this.location.back();
  }

  getCompanyWebsite(): string | null {
    const raw = (this.job?.companyWebsite || '').trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }

  getCompanyLogo(): string {
    const logo = (this.job?.companyLogoUrl || '').trim();
    if (logo) return logo;
    return this.buildInitialsLogo(this.job?.companyName || 'Company');
  }

  onCompanyLogoError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    const fallback = this.buildInitialsLogo(this.job?.companyName || 'Company');
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }

  private extractSkillNames(skills: unknown): string {
    if (!Array.isArray(skills)) return '';
    return skills
      .map((item: any) => {
        if (typeof item === 'string') return item;
        return item?.skillName || item?.name || item?.skill || '';
      })
      .filter(Boolean).join(', ');
  }

  private extractTopEducation(education: unknown): string {
    if (!Array.isArray(education) || education.length === 0) return 'Not specified';
    const top = education[0] as any;
    const degree = top?.degree || top?.qualification || 'Degree not set';
    const institution = top?.institution ? ` from ${top.institution}` : '';
    const year = top?.year ? ` (${top.year})` : '';
    return `${degree}${institution}${year}`;
  }

  private extractExperienceSummary(experience: unknown): string {
    if (!Array.isArray(experience) || experience.length === 0) return 'No experience listed';
    return experience
      .map((e: any) => {
        const role = e?.jobTitle || 'Role';
        const company = e?.company ? ` at ${e.company}` : '';
        const duration = e?.duration ? ` (${e.duration})` : '';
        return `${role}${company}${duration}`;
      })
      .join('; ');
  }

  private extractProjects(projects: unknown): string {
    if (!Array.isArray(projects) || projects.length === 0) return '';
    return projects
      .map((p: any) => p?.title || p?.projectName || p?.name || '')
      .filter(Boolean).slice(0, 3).join(', ');
  }

  private extractCertifications(certifications: unknown): string {
    if (!Array.isArray(certifications) || certifications.length === 0) return '';
    return certifications
      .map((c: any) => c?.certificationName || c?.name || c?.title || '')
      .filter(Boolean).slice(0, 3).join(', ');
  }

  private getResumeBuilderDraft(userId: number): any | null {
    try {
      const raw = localStorage.getItem(`resume_builder_${userId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed.versions) {
        const active = parsed.activeVersion || 'IT';
        return parsed.versions?.[active] || null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private extractBuilderSkills(builderData: any): string {
    const skills = Array.isArray(builderData?.skills) ? builderData.skills : [];
    return skills.filter((s: any) => typeof s === 'string' && s.trim()).join(', ');
  }

  private extractBuilderEducation(builderData: any): string {
    const education = Array.isArray(builderData?.education) ? builderData.education : [];
    if (education.length === 0) return '';
    const first = education[0] || {};
    const degree = (first.degree || '').trim();
    const institution = (first.institution || '').trim();
    const year = (first.year || '').trim();
    return [degree, institution ? `from ${institution}` : '', year ? `(${year})` : ''].filter(Boolean).join(' ');
  }

  private extractBuilderExperience(builderData: any): string {
    const experience = Array.isArray(builderData?.experience) ? builderData.experience : [];
    if (experience.length === 0) return '';
    return experience
      .map((e: any) => {
        const role = (e?.role || '').trim();
        const company = (e?.company || '').trim();
        const summary = (e?.summary || '').trim();
        return [role, company ? `at ${company}` : '', summary].filter(Boolean).join(' ');
      })
      .filter(Boolean)
      .slice(0, 3)
      .join('; ');
  }

  private extractBuilderProjects(builderData: any): string {
    const projects = Array.isArray(builderData?.projects) ? builderData.projects : [];
    return projects
      .map((p: any) => (p?.title || '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
  }

  private extractBuilderCertifications(builderData: any): string {
    const certs = Array.isArray(builderData?.certifications) ? builderData.certifications : [];
    return certs
      .map((c: any) => (c?.name || '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
  }

  private escapeHtml(raw: string): string {
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private buildInitialsLogo(name: string): string {
    const clean = (name || 'Company').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    const initials = (parts.slice(0, 2).map(p => p[0]).join('') || clean.slice(0, 2)).toUpperCase();
    const safe = initials.replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'CO';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='128' height='128' rx='18' fill='#0F172A'/><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' fill='#FFFFFF' font-family='Arial, sans-serif' font-size='48' font-weight='700'>${safe}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
