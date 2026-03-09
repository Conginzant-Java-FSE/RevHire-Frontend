import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-workflow-hub',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './workflow-hub.component.html',
  styleUrl: './workflow-hub.component.css'
})
export class WorkflowHubComponent {
  authService = inject(AuthService);
}
