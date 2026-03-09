import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { JobService } from '../../../core/services/job.service';
import { JobResponse, JobType, JobStatus } from '../../../core/models/job.model';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { ProfileService } from '../../../core/services/profile.service';
import Swal from 'sweetalert2';

type WorkMode = '' | 'REMOTE' | 'HYBRID' | 'ONSITE';
type ExperienceLevel = '' | 'FRESHER' | 'MID' | 'SENIOR';
type DatePosted = '' | '24H' | '7D' | '30D';
type SortBy = 'LATEST' | 'SALARY_DESC' | 'MOST_APPLIED';

interface SavedFilterPreset {
  name: string;
  filters: {
    keyword: string;
    skillsKeyword: string;
    companyKeyword: string;
    location: string;
    selectedType: JobType | '';
    workMode: WorkMode;
    experienceLevel: ExperienceLevel;
    minSalary: number;
    maxSalary: number;
    datePosted: DatePosted;
    industryType: string;
    sortBy: SortBy;
  };
}

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.css'
})
export class JobListComponent implements OnInit {
  jobs: JobResponse[] = [];
  isLoading = true;
  hoveredJobId: number | null = null;
  expandedJobId: number | null = null;
  showFilters = false;

  keyword = '';
  skillsKeyword = '';
  companyKeyword = '';
  location = '';
  selectedType: JobType | '' = '';

  workMode: WorkMode = '';
  experienceLevel: ExperienceLevel = '';
  minSalary = 0;
  maxSalary = 300000;
  datePosted: DatePosted = '';
  industryType = '';
  sortBy: SortBy = 'LATEST';

  readonly minSalaryLimit = 0;
  readonly maxSalaryLimit = 300000;

  jobTypes = Object.values(JobType);
  availableSkills: string[] = [];
  availableLocations: string[] = [];

  savedJobIds = new Set<number>();
  isSavingJobId: number | null = null;
  searchHistory: string[] = [];
  savedPresets: SavedFilterPreset[] = [];
  recentlyViewedIds: number[] = [];
  seekerSkills: string[] = [];
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  private jobService = inject(JobService);
  private savedJobService = inject(SavedJobService);
  private profileService = inject(ProfileService);
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.loadSearchHistory();
    this.loadPresets();
    this.loadRecentlyViewed();
    this.loadSeekerSkills();
    this.loadFilterMetadata();
    this.applyUrlFilters();
    this.loadJobs();
    this.loadSavedJobs();
  }

  loadJobs() {
    this.isLoading = true;

    const serverKeyword = [this.keyword, this.skillsKeyword, this.companyKeyword]
      .filter(Boolean)
      .join(' ')
      .trim();

    this.jobService.searchJobs(serverKeyword, this.location, this.selectedType as any).subscribe({
      next: (res) => {
        const openJobs = res.data?.filter(j => j.status === JobStatus.OPEN) || [];
        this.jobs = this.sortJobs(openJobs.filter(j => this.matchClientFilters(j)));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.jobs = [];
      }
    });
  }

  onSearch() {
    if (this.minSalary > this.maxSalary) {
      Swal.fire('Invalid Salary Range', 'Minimum salary cannot be greater than maximum salary.', 'warning');
      return;
    }

    this.pushSearchHistory();
    this.loadJobs();
  }

  triggerInstantSearch() {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }

    this.searchDebounceHandle = setTimeout(() => this.onSearch(), 300);
  }

  clearFilters() {
    this.keyword = '';
    this.skillsKeyword = '';
    this.companyKeyword = '';
    this.location = '';
    this.selectedType = '';
    this.workMode = '';
    this.experienceLevel = '';
    this.minSalary = this.minSalaryLimit;
    this.maxSalary = this.maxSalaryLimit;
    this.datePosted = '';
    this.industryType = '';
    this.sortBy = 'LATEST';
    this.loadJobs();
  }

  saveCurrentPreset() {
    Swal.fire({
      title: 'Save Filter Preset',
      input: 'text',
      inputPlaceholder: 'Preset name',
      showCancelButton: true,
      confirmButtonText: 'Save'
    }).then(result => {
      const name = (result.value || '').trim();
      if (!result.isConfirmed || !name) return;

      const next: SavedFilterPreset = {
        name,
        filters: this.exportFilters()
      };

      this.savedPresets = [next, ...this.savedPresets.filter(p => p.name !== name)].slice(0, 8);
      localStorage.setItem('job_filter_presets', JSON.stringify(this.savedPresets));
      Swal.fire({ icon: 'success', title: 'Preset saved', timer: 1000, showConfirmButton: false });
    });
  }

  applyPreset(preset: SavedFilterPreset) {
    const f = preset.filters;
    this.keyword = f.keyword;
    this.skillsKeyword = f.skillsKeyword;
    this.companyKeyword = f.companyKeyword;
    this.location = f.location;
    this.selectedType = f.selectedType;
    this.workMode = f.workMode;
    this.experienceLevel = f.experienceLevel;
    this.minSalary = f.minSalary;
    this.maxSalary = f.maxSalary;
    this.datePosted = f.datePosted;
    this.industryType = f.industryType;
    this.sortBy = f.sortBy;
    this.loadJobs();
  }

  removePreset(name: string) {
    this.savedPresets = this.savedPresets.filter(p => p.name !== name);
    localStorage.setItem('job_filter_presets', JSON.stringify(this.savedPresets));
  }

  toggleSaveJob(jobId: number) {
    const userId = this.authService.currentUser()?.id;
    if (!userId || !this.authService.isJobSeeker()) return;

    this.isSavingJobId = jobId;
    const isSaved = this.savedJobIds.has(jobId);

    const action = isSaved
      ? this.savedJobService.unsaveJob(userId, jobId)
      : this.savedJobService.saveJob(userId, jobId);

    action.subscribe({
      next: () => {
        if (isSaved) {
          this.savedJobIds.delete(jobId);
        } else {
          this.savedJobIds.add(jobId);
        }
        this.isSavingJobId = null;
      },
      error: (err) => {
        this.isSavingJobId = null;
        Swal.fire('Action Failed', err.error?.message || 'Could not update saved jobs.', 'error');
      }
    });
  }

  isSaved(jobId: number): boolean {
    return this.savedJobIds.has(jobId);
  }

  toggleJobDetails(jobId: number) {
    if (this.expandedJobId === jobId) {
      this.expandedJobId = null;
    } else {
      this.expandedJobId = jobId;
      this.markRecentlyViewed(jobId);
    }
  }

  markRecentlyViewed(jobId: number) {
    this.recentlyViewedIds = [jobId, ...this.recentlyViewedIds.filter(id => id !== jobId)].slice(0, 20);
    localStorage.setItem('recently_viewed_jobs', JSON.stringify(this.recentlyViewedIds));
  }

  get recentlyViewedJobs(): JobResponse[] {
    if (this.recentlyViewedIds.length === 0) return [];
    const byId = new Map(this.jobs.map(job => [job.id, job]));
    return this.recentlyViewedIds.map(id => byId.get(id)).filter((j): j is JobResponse => !!j).slice(0, 6);
  }

  getSkillMatchPercent(job: JobResponse): number {
    const required = (job.skills || []).map(s => s.toLowerCase());
    if (required.length === 0 || this.seekerSkills.length === 0) return 0;

    const overlap = required.filter(skill => this.seekerSkills.includes(skill));
    return Math.round((overlap.length / required.length) * 100);
  }

  scrollCarousel(direction: 'left' | 'right') {
    const track = document.querySelector('.main-jobs-track');
    if (track) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  getCompanyWebsite(job: JobResponse): string | null {
    const raw = (job.companyWebsite || '').trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }

  getCompanyLogo(job: JobResponse): string {
    const logo = (job.companyLogoUrl || '').trim();
    if (logo) return logo;
    return this.buildInitialsLogo(job.companyName || 'Company');
  }

  onCompanyLogoError(event: Event, companyName: string) {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    const fallback = this.buildInitialsLogo(companyName || 'Company');
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }

  private applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    const keyword = (params.get('keyword') || '').trim();
    const company = (params.get('company') || '').trim();
    const location = (params.get('location') || '').trim();
    const skills = (params.get('skills') || '').trim();

    if (keyword) this.keyword = keyword;
    if (company) this.companyKeyword = company;
    if (location) this.location = location;
    if (skills) this.skillsKeyword = skills;
  }

  private loadSavedJobs() {
    const userId = this.authService.currentUser()?.id;
    if (!userId || !this.authService.isJobSeeker()) return;

    this.savedJobService.getSavedJobs(userId).subscribe({
      next: (jobs) => {
        this.savedJobIds = new Set((jobs || []).map(job => job.id));
      }
    });
  }

  private matchClientFilters(job: JobResponse): boolean {
    if (this.skillsKeyword) {
      const joinedSkills = (job.skills || []).join(' ').toLowerCase();
      if (!joinedSkills.includes(this.skillsKeyword.toLowerCase())) {
        return false;
      }
    }

    if (this.companyKeyword && !job.companyName.toLowerCase().includes(this.companyKeyword.toLowerCase())) {
      return false;
    }

    if (this.workMode && !this.matchesWorkMode(job, this.workMode)) {
      return false;
    }

    if (this.experienceLevel && !this.matchesExperience(job, this.experienceLevel)) {
      return false;
    }

    if (!this.matchesSalary(job)) {
      return false;
    }

    if (this.datePosted && !this.matchesPostedWindow(job, this.datePosted)) {
      return false;
    }

    if (this.industryType) {
      const haystack = `${job.companyName} ${job.description}`.toLowerCase();
      if (!haystack.includes(this.industryType.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  private sortJobs(jobs: JobResponse[]): JobResponse[] {
    const sorted = [...jobs];
    if (this.sortBy === 'SALARY_DESC') {
      sorted.sort((a, b) => b.maxSalary - a.maxSalary);
      return sorted;
    }

    if (this.sortBy === 'MOST_APPLIED') {
      sorted.sort((a, b) => (b.applicationCount || 0) - (a.applicationCount || 0));
      return sorted;
    }

    sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return sorted;
  }

  private matchesWorkMode(job: JobResponse, mode: WorkMode): boolean {
    const text = `${job.location} ${job.description}`.toLowerCase();

    if (mode === 'REMOTE') return text.includes('remote');
    if (mode === 'HYBRID') return text.includes('hybrid');
    if (mode === 'ONSITE') return !text.includes('remote') && !text.includes('hybrid');

    return true;
  }

  private matchesExperience(job: JobResponse, level: ExperienceLevel): boolean {
    const minExp = Math.max(0, job.minExperienceYears || 0);

    if (level === 'FRESHER') return minExp <= 1;
    if (level === 'MID') return minExp >= 2 && minExp <= 5;
    if (level === 'SENIOR') return minExp > 5;

    return true;
  }

  private matchesSalary(job: JobResponse): boolean {
    // If no salary filters were changed from their defaults, skip this filter
    if (this.minSalary <= 0 && this.maxSalary >= this.maxSalaryLimit) return true;
    // If the job has no salary data, let it pass
    if (job.minSalary == null && job.maxSalary == null) return true;
    const jobMin = job.minSalary ?? 0;
    const jobMax = job.maxSalary ?? this.maxSalaryLimit;
    const overlap = jobMax >= this.minSalary && jobMin <= this.maxSalary;
    return overlap;
  }

  private matchesPostedWindow(job: JobResponse, window: DatePosted): boolean {
    const created = new Date(job.createdAt).getTime();
    const now = Date.now();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);

    if (window === '24H') return diffDays <= 1;
    if (window === '7D') return diffDays <= 7;
    if (window === '30D') return diffDays <= 30;

    return true;
  }

  private loadSearchHistory() {
    const raw = localStorage.getItem('job_search_history');
    if (!raw) return;
    try {
      this.searchHistory = JSON.parse(raw) as string[];
    } catch {
      this.searchHistory = [];
    }
  }

  private pushSearchHistory() {
    const phrase = [this.keyword, this.skillsKeyword, this.location].filter(Boolean).join(' ').trim();
    if (!phrase) return;
    this.searchHistory = [phrase, ...this.searchHistory.filter(item => item !== phrase)].slice(0, 8);
    localStorage.setItem('job_search_history', JSON.stringify(this.searchHistory));
  }

  private loadPresets() {
    const raw = localStorage.getItem('job_filter_presets');
    if (!raw) return;
    try {
      this.savedPresets = JSON.parse(raw) as SavedFilterPreset[];
    } catch {
      this.savedPresets = [];
    }
  }

  private loadRecentlyViewed() {
    const raw = localStorage.getItem('recently_viewed_jobs');
    if (!raw) return;
    try {
      this.recentlyViewedIds = JSON.parse(raw) as number[];
    } catch {
      this.recentlyViewedIds = [];
    }
  }

  private exportFilters(): SavedFilterPreset['filters'] {
    return {
      keyword: this.keyword,
      skillsKeyword: this.skillsKeyword,
      companyKeyword: this.companyKeyword,
      location: this.location,
      selectedType: this.selectedType,
      workMode: this.workMode,
      experienceLevel: this.experienceLevel,
      minSalary: this.minSalary,
      maxSalary: this.maxSalary,
      datePosted: this.datePosted,
      industryType: this.industryType,
      sortBy: this.sortBy
    };
  }

  private loadSeekerSkills() {
    const userId = this.authService.currentUser()?.id;
    if (!userId || !this.authService.isJobSeeker()) return;

    this.profileService.getResume(userId).subscribe({
      next: (res) => {
        const skills = (res.data?.skillsList || [])
          .map((item: any) => (typeof item === 'string' ? item : item?.skillName || item?.name || item?.skill || ''))
          .filter(Boolean)
          .map((s: string) => s.toLowerCase());
        this.seekerSkills = skills;
      }
    });
  }

  private loadFilterMetadata() {
    this.jobService.getAllSkills().subscribe({
      next: (res) => {
        this.availableSkills = (res.data || []).slice(0, 50);
      }
    });

    this.jobService.getJobLocations().subscribe({
      next: (res) => {
        this.availableLocations = (res.data || []).slice(0, 50);
      }
    });

    this.jobService.getJobTypes().subscribe({
      next: (res) => {
        const types = (res.data || []) as JobType[];
        if (types.length > 0) {
          this.jobTypes = types;
        }
      }
    });
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
