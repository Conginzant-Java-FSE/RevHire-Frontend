import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { UserProfileInfo } from '../../../core/models/profile.model';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-employer-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './employer-profile.component.html'
})
export class EmployerProfileComponent implements OnInit {
    profile: UserProfileInfo | null = null;
    isLoading = true;
    isEditing = false;
    editData: Partial<UserProfileInfo> = {};

    private profileService = inject(ProfileService);
    private authService = inject(AuthService);
    themeService = inject(ThemeService);

    ngOnInit() {
        this.loadProfile();
    }

    loadProfile() {
        this.isLoading = true;
        this.profileService.getCurrentProfile().subscribe({
            next: (res) => {
                this.profile = (res as any).data || null;
                if (this.profile) {
                    this.editData = { ...this.profile };
                    this.authService.syncCurrentUserProfile({
                        name: this.profile.name,
                        email: this.profile.email
                    });
                }
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
            const payload = this.buildPayload();
            this.profileService.updateMyProfile(payload).subscribe({
                next: () => {
                    this.isEditing = false;
                    this.loadProfile();
                    Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated successfully', timer: 1500, showConfirmButton: false });
                },
                error: (err) => {
                    Swal.fire('Error', err.error?.message || 'Failed to update profile', 'error');
                }
            });
        }
    }

    private buildPayload(): Partial<UserProfileInfo> {
        const source = this.editData || {};
        const payload: Partial<UserProfileInfo> = {};

        Object.entries(source).forEach(([key, value]) => {
            if (value !== undefined) {
                (payload as any)[key] = typeof value === 'string' ? value.trim() : value;
            }
        });

        return payload;
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
              <input type="password" id="new-pwd" class="form-control mb-3">
              <label class="form-label small fw-medium">Confirm New Password <span class="text-danger">*</span></label>
              <input type="password" id="confirm-pwd" class="form-control">
            </div>
          `,
                    showCancelButton: true,
                    confirmButtonText: 'Update Password',
                    showLoaderOnConfirm: true,
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

    getDisplayCompanyName(): string {
        return (this.profile?.companyName || this.profile?.name || 'Company').trim();
    }

    getWebsiteUrl(): string | null {
        const raw = (this.profile?.website || '').trim();
        if (!raw) return null;
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        return `https://${raw}`;
    }

    getCompanyLogoUrl(): string {
        const website = this.getWebsiteUrl();
        const domain = this.extractDomain(website);
        if (domain) {
            return `https://logo.clearbit.com/${domain}`;
        }
        return this.getFallbackLogoUrl();
    }

    onCompanyLogoError(event: Event) {
        const img = event.target as HTMLImageElement | null;
        if (!img) return;
        const fallback = this.getFallbackLogoUrl();
        if (img.src !== fallback) {
            img.src = fallback;
        }
    }

    private getFallbackLogoUrl(): string {
        return this.buildInitialsLogo(this.getDisplayCompanyName());
    }

    private extractDomain(website: string | null): string | null {
        if (!website) return null;
        try {
            const host = new URL(website).host;
            return host ? host.toLowerCase() : null;
        } catch {
            return null;
        }
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
