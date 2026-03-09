import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { UserProfileInfo } from '../../../core/models/profile.model';
import { ThemeService } from '../../../core/services/theme.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './company-profile.component.html',
  styleUrl: './company-profile.component.css'
})
export class CompanyProfileComponent implements OnInit {
  profile: UserProfileInfo | null = null;
  isLoading = true;

  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private profileService = inject(ProfileService);
  themeService = inject(ThemeService);

  ngOnInit() {
    const companyId = Number(this.route.snapshot.paramMap.get('id'));
    if (!companyId) {
      this.isLoading = false;
      return;
    }
    this.loadCompany(companyId);
  }

  goBack() {
    this.location.back();
  }

  getWebsiteUrl(): string | null {
    const raw = (this.profile?.website || '').trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }

  getDisplayCompanyName(): string {
    return (this.profile?.companyName || this.profile?.name || 'Company').trim();
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

  private loadCompany(companyId: number) {
    this.isLoading = true;
    this.profileService.getUserById(companyId).subscribe({
      next: (res) => {
        this.profile = (res as any).data || null;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Not Found', 'Company details could not be loaded.', 'error');
      }
    });
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
