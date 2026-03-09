import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { JobService } from '../../../core/services/job.service';
import { JobResponse } from '../../../core/models/job.model';

@Component({
  selector: 'app-smart-matching',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './smart-matching.component.html',
  styleUrl: './smart-matching.component.css'
})
export class SmartMatchingComponent implements OnInit {
  authService = inject(AuthService);
  private jobService = inject(JobService);

  topJobs: JobResponse[] = [];
  loading = true;

  ngOnInit(): void {
    this.jobService.getRecentJobs().subscribe({
      next: (res) => {
        this.topJobs = (res.data || []).slice(0, 6);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
