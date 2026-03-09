import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileInfo, ResumeResponse } from '../../../core/models/profile.model';
import { ThemeService } from '../../../core/services/theme.service';
import Swal from 'sweetalert2';

type ProfileVisibility = 'PUBLIC' | 'RECRUITERS_ONLY' | 'PRIVATE';

interface ResumeVersion {
  id: string;
  label: string;
  uploadedAt: string;
  source: 'Manual Upload' | 'Easy Apply Upload';
}

interface LocalProfileEnhancements {
  profileVisibility: ProfileVisibility;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
  resumeVersions: ResumeVersion[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profile: UserProfileInfo | null = null;
  resume: ResumeResponse | null = null;

  isEditing = false;
  editData: Partial<UserProfileInfo> = {};

  isLoading = true;
  isUploading = false;

  profileVisibility: ProfileVisibility = 'PUBLIC';
  linkedinUrl = '';
  githubUrl = '';
  websiteUrl = '';
  resumeVersions: ResumeVersion[] = [];

  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.loadData();
  }

  get profileStrength(): number {
    const checks = [
      !!this.profile?.name,
      !!this.profile?.phone,
      !!this.profile?.location,
      !!this.profile?.currentEmploymentStatus,
      !!this.resume?.resumeFile,
      this.parsedSkills.length > 0,
      this.parsedExperience.length > 0,
      this.parsedEducation.length > 0,
      !!this.linkedinUrl,
      !!(this.githubUrl || this.websiteUrl)
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }

  get profileStrengthTone(): string {
    if (this.profileStrength >= 80) return 'success';
    if (this.profileStrength >= 50) return 'warning';
    return 'danger';
  }

  get parsedSkills(): string[] {
    const raw = this.safeArray(this.resume?.skillsList);
    return raw.map(item => this.itemToText(item)).filter(Boolean);
  }

  get parsedEducation(): string[] {
    const raw = this.safeArray(this.resume?.educationList);
    return raw.map(item => this.itemToText(item)).filter(Boolean);
  }

  get parsedExperience(): string[] {
    const raw = this.safeArray(this.resume?.experienceList);
    return raw.map(item => this.itemToText(item)).filter(Boolean);
  }

  get parsedProjects(): string[] {
    const raw = this.safeArray(this.resume?.projectsList);
    return raw.map(item => this.itemToText(item)).filter(Boolean);
  }

  get resumeTips(): string[] {
    const tips: string[] = [];

    if (this.parsedSkills.length < 5) tips.push('Add more role-relevant skills for better matching.');
    if (this.parsedProjects.length === 0) tips.push('Include project highlights with measurable outcomes.');
    if (!this.profile?.location) tips.push('Set your location for stronger local and hybrid recommendations.');
    if (!this.linkedinUrl) tips.push('Add your LinkedIn profile to improve recruiter trust.');

    return tips.length > 0 ? tips : ['Your profile looks strong. Keep your resume updated for new applications.'];
  }

  loadData() {
    this.isLoading = true;
    this.profileService.getCurrentProfile().subscribe({
      next: (res) => {
        this.profile = res.data || null;
        if (this.profile) {
          this.authService.syncCurrentUserProfile({
            name: this.profile.name,
            email: this.profile.email
          });
          this.editData = { ...this.profile };
          this.loadEnhancements(this.profile.id);
          this.loadResume(this.profile.id);
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadResume(userId: number) {
    this.profileService.getResume(userId).subscribe({
      next: (res) => {
        this.resume = res.data || null;
        this.syncCurrentResumeVersion();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.profile) {
      this.editData = { ...this.profile };
    }
  }

  saveProfile() {
    if (this.profile) {
      this.profileService.updateProfile(this.profile.id, this.editData).subscribe({
        next: (res) => {
          this.profile = res.data || null;
          this.isEditing = false;
          Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated successfully', timer: 1500, showConfirmButton: false });
        },
        error: (err) => {
          Swal.fire('Error', err.error?.message || 'Failed to update profile', 'error');
        }
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && this.profile) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Maximum file size is 2MB', 'warning');
        return;
      }

      this.isUploading = true;
      this.profileService.uploadResumeFile(this.profile.id, file).subscribe({
        next: () => {
          this.isUploading = false;
          this.pushResumeVersion(file.name, 'Manual Upload');
          Swal.fire({ icon: 'success', title: 'Upload Complete', text: 'Resume uploaded successfully', timer: 1500, showConfirmButton: false });
          this.loadResume(this.profile!.id);
        },
        error: (err) => {
          this.isUploading = false;
          Swal.fire('Upload Failed', err.error?.message || 'Could not upload file.', 'error');
        }
      });
    }
  }

  downloadResume(fileId: number) {
    this.profileService.downloadResumeFile(fileId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.resume?.resumeFile?.fileName || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  deleteResume(fileId: number) {
    Swal.fire({
      title: 'Delete Resume?',
      text: 'You cannot undo this action.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444'
    }).then(result => {
      if (result.isConfirmed && this.profile) {
        this.profileService.deleteResumeFile(fileId).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Your resume file has been deleted.', 'success');
            this.loadResume(this.profile!.id);
          }
        });
      }
    });
  }

  saveEnhancements(showToast = true) {
    if (!this.profile) return;

    const data: LocalProfileEnhancements = {
      profileVisibility: this.profileVisibility,
      linkedinUrl: this.linkedinUrl.trim(),
      githubUrl: this.githubUrl.trim(),
      websiteUrl: this.websiteUrl.trim(),
      resumeVersions: this.resumeVersions
    };

    localStorage.setItem(this.enhancementKey(this.profile.id), JSON.stringify(data));
    if (showToast) {
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile preferences saved.', timer: 1200, showConfirmButton: false });
    }
  }

  changePassword() {
    if (!this.profile) return;
    const userId = this.profile.id;

    this.profileService.getUserById(userId).subscribe({
      next: (res: any) => {
        const securityQuestion = res.data?.securityQuestion;

        Swal.fire({
          title: 'Change Password',
          html: `
            <div class="text-start">
              <label class="form-label small fw-medium">Old Password <span class="text-danger">*</span></label>
              <input type="password" id="old-pwd" class="form-control mb-3">
              ${securityQuestion ? `
              <div class="alert alert-info py-2 px-3 mb-2" role="alert" style="font-size: 0.82rem;">
                <strong>Security Question:</strong> ${securityQuestion}
              </div>
              <label class="form-label small fw-medium">Your Security Answer <span class="text-danger">*</span></label>
              <input type="text" id="security-ans" class="form-control mb-3" placeholder="Your registered answer">
              ` : ''}
              <label class="form-label small fw-medium">New Password <span class="text-danger">*</span></label>
              <div class="input-group mb-3">
                <input type="password" id="new-pwd" class="form-control">
                <button class="btn btn-outline-secondary" type="button" id="toggle-new-pwd">Show</button>
              </div>
              <label class="form-label small fw-medium">Confirm New Password <span class="text-danger">*</span></label>
              <div class="input-group">
                <input type="password" id="confirm-pwd" class="form-control">
                <button class="btn btn-outline-secondary" type="button" id="toggle-confirm-pwd">Show</button>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Update Password',
          showLoaderOnConfirm: true,
          didOpen: () => {
            const newPwdInput = document.getElementById('new-pwd') as HTMLInputElement | null;
            const confirmPwdInput = document.getElementById('confirm-pwd') as HTMLInputElement | null;
            const toggleNewPwd = document.getElementById('toggle-new-pwd') as HTMLButtonElement | null;
            const toggleConfirmPwd = document.getElementById('toggle-confirm-pwd') as HTMLButtonElement | null;

            const bindToggle = (input: HTMLInputElement | null, button: HTMLButtonElement | null) => {
              if (!input || !button) return;
              button.addEventListener('click', () => {
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                button.textContent = show ? 'Hide' : 'Show';
              });
            };

            bindToggle(newPwdInput, toggleNewPwd);
            bindToggle(confirmPwdInput, toggleConfirmPwd);
          },
          preConfirm: () => {
            const oldPwd = (document.getElementById('old-pwd') as HTMLInputElement).value;
            const newPwd = (document.getElementById('new-pwd') as HTMLInputElement).value;
            const confirmPwd = (document.getElementById('confirm-pwd') as HTMLInputElement).value;
            const securityAnsInput = document.getElementById('security-ans') as HTMLInputElement | null;

            if (!oldPwd || !newPwd || !confirmPwd) {
              Swal.showValidationMessage('Please fill all required fields');
              return false;
            }
            if (securityQuestion && securityAnsInput && !securityAnsInput.value.trim()) {
              Swal.showValidationMessage('Please provide your security question answer');
              return false;
            }
            if (newPwd !== confirmPwd) {
              Swal.showValidationMessage('New passwords do not match');
              return false;
            }
            if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(newPwd)) {
              Swal.showValidationMessage('Password must contain at least 1 capital letter, 1 number, and 1 special character');
              return false;
            }

            return new Promise((resolve) => {
              this.profileService.changePassword(userId, oldPwd, newPwd).subscribe({
                next: () => resolve(true),
                error: (err) => {
                  Swal.showValidationMessage(`Failed: ${err.error?.message || 'Incorrect current password or security answer'}`);
                  resolve(null);
                }
              });
            });
          },
          allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({ icon: 'success', title: 'Done!', text: 'Password changed successfully.', timer: 1500, showConfirmButton: false });
          }
        });
      },
      error: () => {
        Swal.fire('Error', 'Could not load account details. Please try again.', 'error');
      }
    });
  }

  private safeArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }

  private itemToText(item: any): string {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const fields = ['skillName', 'title', 'name', 'degree', 'institution', 'company', 'role', 'description', 'summary', 'technology', 'skill'];
      for (const field of fields) {
        if (item[field]) return String(item[field]);
      }
      return Object.values(item).join(' - ');
    }
    return '';
  }

  private enhancementKey(userId: number): string {
    return `seeker_profile_plus_${userId}`;
  }

  private loadEnhancements(userId: number) {
    const raw = localStorage.getItem(this.enhancementKey(userId));
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as LocalProfileEnhancements;
      this.profileVisibility = data.profileVisibility || 'PUBLIC';
      this.linkedinUrl = data.linkedinUrl || '';
      this.githubUrl = data.githubUrl || '';
      this.websiteUrl = data.websiteUrl || '';
      this.resumeVersions = Array.isArray(data.resumeVersions) ? data.resumeVersions : [];
    } catch {
      this.profileVisibility = 'PUBLIC';
      this.linkedinUrl = '';
      this.githubUrl = '';
      this.websiteUrl = '';
      this.resumeVersions = [];
    }
  }

  private pushResumeVersion(fileName: string, source: ResumeVersion['source']) {
    this.resumeVersions = [
      {
        id: `${Date.now()}`,
        label: fileName,
        uploadedAt: new Date().toISOString(),
        source: source as ResumeVersion['source']
      },
      ...this.resumeVersions
    ].slice(0, 8);

    this.saveEnhancements(false);
  }

  private syncCurrentResumeVersion() {
    if (!this.profile || !this.resume?.resumeFile) return;

    const file = this.resume.resumeFile;
    const alreadyExists = this.resumeVersions.some(v => v.label === file.fileName && v.uploadedAt === file.uploadDate);

    if (!alreadyExists) {
      this.resumeVersions = [
        {
          id: `server-${file.id}`,
          label: file.fileName,
          uploadedAt: file.uploadDate,
          source: 'Manual Upload' as ResumeVersion['source']
        },
        ...this.resumeVersions
      ].slice(0, 8);

      const raw = localStorage.getItem(this.enhancementKey(this.profile.id));
      if (raw) {
        this.saveEnhancements(false);
      }
    }
  }
}
