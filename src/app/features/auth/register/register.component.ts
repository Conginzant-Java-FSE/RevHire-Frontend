import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/auth.model';
import { ThemeService } from '../../../core/services/theme.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnDestroy {
  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  selectedRole: Role = Role.JOB_SEEKER;
  roles = Role;

  // OTP state
  otpSent = false;
  isSendingOtp = false;
  otpCode = '';
  otpCountdown = 0;
  private countdownInterval: any = null;

  securityQuestions = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your primary school?",
    "What city were you born in?",
    "What was the make of your first car?",
    "What is your favourite book?",
    "What was your childhood nickname?",
    "What is the name of the street you grew up on?"
  ];

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/)
      ]],
      confirmPassword: ['', Validators.required],
      role: [Role.JOB_SEEKER, Validators.required],
      phone: [''],
      location: [''],

      // Employer
      companyName: [''],
      industry: [''],
      companySize: [''],

      // Seeker
      totalExperience: [0],
      currentStatus: [''],

      // Security (optional)
      securityQuestion: [''],
      securityAnswer: ['']
    }, { validators: this.passwordsMatchValidator() });

    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      this.selectedRole = role;
      this.updateValidators(role);
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy() {
    this.clearCountdown();
  }

  updateValidators(role: Role) {
    if (role === Role.EMPLOYER) {
      this.registerForm.get('companyName')?.setValidators([Validators.required]);
      this.registerForm.get('totalExperience')?.clearValidators();
    } else {
      this.registerForm.get('companyName')?.clearValidators();
    }
    this.registerForm.get('companyName')?.updateValueAndValidity();
    this.registerForm.get('totalExperience')?.updateValueAndValidity();
  }

  setRole(role: Role) {
    this.registerForm.patchValue({ role });
  }

  sendOtp() {
    const emailCtrl = this.registerForm.get('email');
    if (!emailCtrl || emailCtrl.invalid) {
      emailCtrl?.markAsTouched();
      Swal.fire({ icon: 'warning', title: 'Invalid Email', text: 'Please enter a valid email address first.' });
      return;
    }

    this.isSendingOtp = true;
    this.authService.sendOtp(emailCtrl.value).subscribe({
      next: (res) => {
        this.isSendingOtp = false;
        this.otpSent = true;
        this.startCountdown();
        Swal.fire({
          icon: 'success',
          title: 'OTP Sent!',
          text: res.message || 'Check your inbox for the 6-digit code.',
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.isSendingOtp = false;
        Swal.fire({
          icon: 'error',
          title: 'Failed to Send OTP',
          text: err.error?.message || 'Could not send OTP. Please try again.'
        });
      }
    });
  }

  private startCountdown() {
    this.clearCountdown();
    this.otpCountdown = 60;
    this.countdownInterval = setInterval(() => {
      this.otpCountdown--;
      if (this.otpCountdown <= 0) this.clearCountdown();
    }, 1000);
  }

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  onSubmit() {
    if (!this.registerForm.valid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (!this.otpSent) {
      Swal.fire({ icon: 'warning', title: 'OTP Required', text: 'Please click Send OTP and verify your email before registering.' });
      return;
    }

    if (!this.otpCode || this.otpCode.trim().length !== 6) {
      Swal.fire({ icon: 'warning', title: 'Enter OTP', text: 'Please enter the 6-digit OTP sent to your email.' });
      return;
    }

    if (this.registerForm.hasError('passwordMismatch')) {
      Swal.fire({ icon: 'warning', title: 'Password Mismatch', text: 'Password and confirm password must match.' });
      return;
    }

    this.isLoading = true;
    this.completeRegistration();
  }

  private completeRegistration() {
    const { confirmPassword, ...formValue } = this.registerForm.value;
    const payload = { ...formValue, otpCode: this.otpCode.trim() };
    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Account Created',
          text: res.message,
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          if (this.selectedRole === Role.EMPLOYER) {
            this.router.navigate(['/employer/dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: err.error?.message || 'Failed to register account'
        });
      }
    });
  }

  private passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get('password')?.value;
      const confirmPassword = group.get('confirmPassword')?.value;
      if (!password || !confirmPassword) return null;
      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }
}
