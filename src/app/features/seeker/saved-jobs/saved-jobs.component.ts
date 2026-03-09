import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { AuthService } from '../../../core/services/auth.service';
import { JobResponse } from '../../../core/models/job.model';
import { ThemeService } from '../../../core/services/theme.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-saved-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './saved-jobs.component.html'
})
export class SavedJobsComponent implements OnInit {
  savedJobs: JobResponse[] = [];
  isLoading = true;

  private savedJobService = inject(SavedJobService);
  private authService = inject(AuthService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.loadSavedJobs();
  }

  loadSavedJobs() {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.isLoading = true;
      this.savedJobService.getSavedJobs(userId).subscribe({
        next: (jobs) => {
          this.savedJobs = jobs || [];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  unsaveJob(jobId: number) {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.savedJobService.unsaveJob(userId, jobId).subscribe({
        next: () => {
          this.savedJobs = this.savedJobs.filter(j => j.id !== jobId);
          Swal.fire({ icon: 'success', title: 'Removed', text: 'Job removed from saved list.', timer: 1500, showConfirmButton: false });
        }
      });
    }
  }
}
