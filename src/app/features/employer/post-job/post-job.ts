import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { JobType } from '../../../core/models/job.model';
import { ThemeService } from '../../../core/services/theme.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './post-job.component.html'
})
export class PostJobComponent {
  jobForm: FormGroup;
  isLoading = false;
  jobTypes = Object.values(JobType);
  skills: string[] = [];
  skillInput = '';

  private fb = inject(FormBuilder);
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  constructor() {
    this.jobForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      location: ['', Validators.required],
      minExperienceYears: [0, [Validators.required, Validators.min(0)]],
      maxExperienceYears: [0, [Validators.required, Validators.min(0)]],
      requiredEducationLevel: ['', Validators.required],
      minSalary: [0, [Validators.required, Validators.min(0)]],
      maxSalary: [0, [Validators.required, Validators.min(0)]],
      jobType: [JobType.FULLTIME, Validators.required],
      deadline: ['', Validators.required],
      numberOfOpenings: [1, [Validators.required, Validators.min(1)]]
    });
  }

  addSkill() {
    if (this.skillInput.trim() && !this.skills.includes(this.skillInput.trim())) {
      this.skills.push(this.skillInput.trim());
      this.skillInput = '';
    }
  }

  removeSkill(skill: string) {
    this.skills = this.skills.filter(s => s !== skill);
  }

  onSubmit() {
    if (this.jobForm.valid) {
      if (this.skills.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Skills Required', text: 'Please add at least one required skill.' });
        return;
      }

      const formValue = this.jobForm.value;
      if (formValue.minSalary > formValue.maxSalary) {
        Swal.fire({ icon: 'warning', title: 'Invalid Salary', text: 'Min salary cannot be greater than max salary.' });
        return;
      }

      this.isLoading = true;
      const currentUser = this.authService.currentUser();

      const jobPostRequest = {
        employerId: currentUser?.id || 0,
        title: formValue.title,
        description: formValue.description,
        location: formValue.location,
        requiredEducationLevel: formValue.requiredEducationLevel,
        salaryMin: formValue.minSalary,
        salaryMax: formValue.maxSalary,
        jobType: formValue.jobType,
        experienceYears: formValue.minExperienceYears,
        maxExperienceYears: formValue.maxExperienceYears,
        openings: formValue.numberOfOpenings,
        skills: this.skills,
        deadline: new Date(formValue.deadline).toISOString().split('T')[0]
      };

      this.jobService.postJob(jobPostRequest).subscribe({
        next: (res) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'Job Posted!',
            text: res.message,
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            this.router.navigate(['/employer/dashboard']);
          });
        },
        error: (err: any) => {
          this.isLoading = false;
          let errorMsg = err.error?.message || 'Something went wrong.';
          if (err.error?.errors && Array.isArray(err.error.errors)) {
            errorMsg = err.error.errors.join('\\n');
          } else if (err.error?.errors) {
            errorMsg = JSON.stringify(err.error.errors);
          }
          Swal.fire({
            icon: 'error',
            title: 'Failed to Post Job',
            text: errorMsg
          });
        }
      });
    } else {
      this.jobForm.markAllAsTouched();
    }
  }
}
