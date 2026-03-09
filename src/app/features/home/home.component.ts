import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { StatisticsService } from '../../core/services/statistics.service';
import { PlatformStats } from '../../core/models/statistics.model';
import { JobService } from '../../core/services/job.service';
import { JobResponse } from '../../core/models/job.model';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
    authService = inject(AuthService);
    themeService = inject(ThemeService);
    private statisticsService = inject(StatisticsService);
    private jobService = inject(JobService);
    private router = inject(Router);
    @ViewChild('heroCard') heroCard?: ElementRef<HTMLElement>;
    currentYear = new Date().getFullYear();
    platformStats: PlatformStats | null = null;
    trendsPreview: string[] = [];
    featuredJobs: JobResponse[] = [];
    heroTilt = '';
    private revealObserver: IntersectionObserver | null = null;

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

        if (this.authService.isAuthenticated()) {
            this.loadFeaturedJobs();
        }
    }

    ngAfterViewInit(): void {
        this.revealObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        this.revealObserver?.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.14 }
        );
        this.observeReveals();
    }

    ngOnDestroy(): void {
        this.revealObserver?.disconnect();
    }

    onHeroMove(event: MouseEvent): void {
        const el = this.heroCard?.nativeElement;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateX = (0.5 - y) * 4;
        const rotateY = (x - 0.5) * 5;

        this.heroTilt = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
        el.style.setProperty('--mx', `${Math.round(x * 100)}%`);
        el.style.setProperty('--my', `${Math.round(y * 100)}%`);
    }

    resetHeroTilt(): void {
        this.heroTilt = '';
        const el = this.heroCard?.nativeElement;
        if (!el) return;
        el.style.setProperty('--mx', '50%');
        el.style.setProperty('--my', '50%');
    }

    private observeReveals(): void {
        const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]');
        nodes.forEach(node => {
            if (node.classList.contains('is-visible')) return;
            this.revealObserver?.observe(node);
        });
    }

    private loadFeaturedJobs(): void {
        this.jobService.getRecentJobs().subscribe({
            next: (res) => {
                this.featuredJobs = (res.data || []).slice(0, 6);
                setTimeout(() => this.observeReveals(), 0);
            },
            error: () => {
                this.jobService.getAllJobs().subscribe({
                    next: (fallback) => {
                        this.featuredJobs = (fallback.data || []).slice(0, 6);
                        setTimeout(() => this.observeReveals(), 0);
                    },
                    error: () => {
                        this.featuredJobs = [];
                    }
                });
            }
        });
    }

    openSmartMatching(): void {
        this.router.navigate(['/smart-matching']);
    }

    openWorkflow(): void {
        this.router.navigate(['/workflow-hub']);
    }

    openInsights(): void {
        this.router.navigate(['/insights-center']);
    }
}
