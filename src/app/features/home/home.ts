import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.spec';
import { ThemeService } from '../../core/services/theme.spec';
import { StatisticsService } from '../../core/services/statistics.spec';
import { PlatformStats } from '../../core/models/statistics.model';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
    authService = inject(AuthService);
    themeService = inject(ThemeService);
    private statisticsService = inject(StatisticsService);
    currentYear = new Date().getFullYear();
    platformStats: PlatformStats | null = null;
    trendsPreview: string[] = [];

    ngOnInit(): void {
        this.statisticsService.getPlatformOverview().subscribe({
            next: (res) => {
                this.platformStats = res.data || null;
            }
        });

        this.statisticsService.getApplicationTrends().subscribe({
            next: (res) => {
                const rows = res.data || [];
                this.trendsPreview = rows.slice(0, 3).map((row: Record<string, unknown>) => {
                    const label = row['label'] ?? row['month'] ?? row['period'] ?? 'Trend';
                    const value = row['value'] ?? row['count'] ?? row['applications'] ?? '';
                    return `${String(label)}: ${String(value)}`;
                });
            }
        });
    }
}
