import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  openForgotPassword(event: Event) {
    event.preventDefault();
    Swal.fire({
      title: 'Forgot password',
      input: 'email',
      inputLabel: 'Email address',
      inputPlaceholder: 'you@example.com',
      showCancelButton: true,
      confirmButtonText: 'Send OTP'
    }).then(result => {
      const email = result.value?.trim();
      if (!result.isConfirmed || !email) {
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid email',
          text: 'Please enter a valid email address.'
        });
        return;
      }
      this.authService.getSecurityQuestion(email).subscribe({
        next: (res) => {
          const question = res.data?.trim() || '';
          this.sendOtpAndOpen(email, question || null);
        },
        error: () => {
          this.sendOtpAndOpen(email, null);
        }
      });
    });
  }

  private sendOtpAndOpen(email: string, question: string | null) {
    this.authService.sendOtp(email).subscribe({
      next: (res) => {
        this.openResetPasswordStep(email, question);
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Failed to send OTP',
          text: err.error?.message || 'Please try again.'
        });
      }
    });
  }

  private openResetPasswordStep(email: string, question: string | null) {
    const passwordPattern = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/;
    const safeQuestion = question ? this.escapeHtml(question) : '';
    const securityQuestionHtml = question
      ? `
        <p style="margin:0 0 6px; text-align:left; font-size:0.9rem; color:#555;">
          Security question: <strong>${safeQuestion}</strong>
        </p>
        <input id="reset-security-answer" class="swal2-input" placeholder="Your answer">
      `
      : '';

    Swal.fire({
      title: 'Reset password',
      html: `
        <input id="reset-otp" class="swal2-input" placeholder="6-digit OTP" maxlength="6">
        ${securityQuestionHtml}
        <input id="reset-new-password" type="password" class="swal2-input" placeholder="New password">
        <input id="reset-confirm-password" type="password" class="swal2-input" placeholder="Confirm password">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Reset password',
      preConfirm: () => {
        const otp = (document.getElementById('reset-otp') as HTMLInputElement)?.value?.trim();
        const securityAnswer = question
          ? (document.getElementById('reset-security-answer') as HTMLInputElement)?.value?.trim()
          : '';
        const newPassword = (document.getElementById('reset-new-password') as HTMLInputElement)?.value || '';
        const confirmPassword = (document.getElementById('reset-confirm-password') as HTMLInputElement)?.value || '';

        if (!otp || otp.length !== 6) {
          Swal.showValidationMessage('Enter the 6-digit OTP');
          return;
        }
        if (question && !securityAnswer) {
          Swal.showValidationMessage('Security answer is required');
          return;
        }
        if (!passwordPattern.test(newPassword)) {
          Swal.showValidationMessage('Password must include 1 capital letter, 1 number, and 1 special character');
          return;
        }
        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage('Passwords do not match');
          return;
        }
        return { otp, newPassword, securityAnswer };
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        return;
      }
      this.authService.resetPassword({
        email,
        otpCode: result.value.otp,
        newPassword: result.value.newPassword,
        securityAnswer: question ? result.value.securityAnswer : undefined
      }).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: 'Password reset',
            text: res.message || 'You can now sign in with your new password.',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Reset failed',
            text: err.error?.message || 'Please try again.'
          });
        }
      });
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  loginWithOtp() {
    Swal.fire({
      title: 'Login with OTP',
      input: 'email',
      inputLabel: 'Email address',
      inputPlaceholder: 'you@example.com',
      showCancelButton: true,
      confirmButtonText: 'Send OTP'
    }).then(result => {
      const email = result.value?.trim();
      if (!result.isConfirmed || !email) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.fire({ icon: 'warning', title: 'Invalid email', text: 'Please enter a valid email address.' });
        return;
      }

      this.authService.getSecurityQuestion(email).subscribe({
        next: () => {
          this.authService.sendOtp(email).subscribe({
            next: () => {
              Swal.fire({
                title: 'Enter OTP',
                html: `
                  <input id="otp-login-code" class="swal2-input" placeholder="6-digit OTP" maxlength="6">
                `,
                showCancelButton: true,
                confirmButtonText: 'Login',
                preConfirm: () => {
                  const otpCode = (document.getElementById('otp-login-code') as HTMLInputElement)?.value?.trim();
                  if (!otpCode || otpCode.length !== 6) {
                    Swal.showValidationMessage('Enter valid 6-digit OTP');
                    return;
                  }
                  return otpCode;
                }
              }).then(otpResult => {
                if (!otpResult.isConfirmed || !otpResult.value) return;
                this.authService.loginWithOtp(email, otpResult.value).subscribe({
                  next: (loginRes) => {
                    Swal.fire({
                      icon: 'success',
                      title: 'Logged in',
                      text: loginRes.message || 'OTP login successful',
                      timer: 1500,
                      showConfirmButton: false
                    }).then(() => {
                      if (this.authService.isEmployer()) {
                        this.router.navigate(['/employer/dashboard']);
                      } else {
                        this.router.navigate(['/']);
                      }
                    });
                  },
                  error: (err) => {
                    Swal.fire({
                      icon: 'error',
                      title: 'OTP Login Failed',
                      text: err.error?.message || 'Invalid or expired OTP'
                    });
                  }
                });
              });
            },
            error: (err) => {
              Swal.fire({
                icon: 'error',
                title: 'Failed to send OTP',
                text: err.error?.message || 'Please try again.'
              });
            }
          });
        },
        error: () => {
          Swal.fire({
            icon: 'warning',
            title: 'Account not found',
            text: 'No user exists with this email. Please create an account first.'
          });
        }
      });
    });
  }

  loginWithGoogle() {
    const googleUrl = environment.googleAuthUrl || 'https://accounts.google.com/signin/v2/identifier';
    window.location.href = googleUrl;
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'Welcome back!',
            text: res.message,
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            if (this.authService.isEmployer()) {
              this.router.navigate(['/employer/dashboard']);
            } else {
              this.router.navigate(['/']); // Seekers go to home
            }
          });
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: err.error?.message || 'Invalid credentials'
          });
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
