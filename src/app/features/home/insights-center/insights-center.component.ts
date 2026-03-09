import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import { PlatformStats } from '../../../core/models/statistics.model';

@Component({
  selector: 'app-insights-center',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './insights-center.component.html',
  styleUrl: './insights-center.component.css'
})
export class InsightsCenterComponent implements OnInit {
  authService = inject(AuthService);
  private statisticsService = inject(StatisticsService);

  stats: PlatformStats | null = null;
  trends: string[] = [];

  ngOnInit(): void {
    this.statisticsService.getPlatformOverview().subscribe({
      next: (res) => this.stats = res.data || null
    });

    this.statisticsService.getApplicationTrends().subscribe({
      next: (res) => {
        const rows = res.data || [];
        this.trends = rows.slice(0, 5).map((row: Record<string, unknown>) => {
          const label = row['label'] ?? row['month'] ?? row['period'] ?? 'Trend';
          const value = row['value'] ?? row['count'] ?? row['applications'] ?? '';
          return `${String(label)}: ${String(value)}`;
        });
      }
    });
  }
}
