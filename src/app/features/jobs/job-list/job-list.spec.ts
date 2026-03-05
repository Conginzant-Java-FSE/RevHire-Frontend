import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { JobListComponent } from './job-list.component';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('JobListComponent', () => {
  let component: JobListComponent;
  let fixture: ComponentFixture<JobListComponent>;

  let jobServiceSpy: jasmine.SpyObj<JobService>;
  let savedJobServiceSpy: jasmine.SpyObj<SavedJobService>;
  let profileServiceSpy: jasmine.SpyObj<ProfileService>;

  const mockJobs: any[] = [
    {
      id: 1, title: 'Backend Dev', companyName: 'TechCorp', location: 'Hyderabad',
      jobType: 'FULL_TIME', status: 'OPEN', salaryMin: 40000, salaryMax: 70000,
      minSalary: 40000, maxSalary: 70000, experienceYears: 2,
      minExperienceYears: 2, maxExperienceYears: 5, skills: ['Java', 'Spring'],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      postedAt: new Date().toISOString(), description: 'Backend role', applicationCount: 5
    },
    {
      id: 2, title: 'UI Designer', companyName: 'UILtd', location: 'Mumbai',
      jobType: 'CONTRACT', status: 'OPEN', salaryMin: 30000, salaryMax: 50000,
      minSalary: 30000, maxSalary: 50000, experienceYears: 1,
      minExperienceYears: 0, maxExperienceYears: 2, skills: ['CSS', 'Figma'],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      postedAt: new Date().toISOString(), description: 'UI role remote', applicationCount: 2
    }
  ];

  const mockAuthService = {
    currentUser: () => ({ id: 5, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' }),
    isJobSeeker: () => true,
    isEmployer: () => false,
    isAuthenticated: () => true
  };

  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    localStorage.clear();

    jobServiceSpy = jasmine.createSpyObj('JobService', [
      'searchJobs', 'getAllSkills', 'getJobLocations', 'getJobTypes'
    ]);
    savedJobServiceSpy = jasmine.createSpyObj('SavedJobService', ['saveJob', 'unsaveJob', 'getSavedJobs']);
    profileServiceSpy = jasmine.createSpyObj('ProfileService', ['getResume']);

    jobServiceSpy.searchJobs.and.returnValue(of({ success: true, data: mockJobs }) as any);
    jobServiceSpy.getAllSkills.and.returnValue(of({ success: true, data: ['Java', 'Spring'] }) as any);
    jobServiceSpy.getJobLocations.and.returnValue(of({ success: true, data: ['Hyderabad', 'Mumbai'] }) as any);
    jobServiceSpy.getJobTypes.and.returnValue(of({ success: true, data: ['FULL_TIME', 'CONTRACT'] }) as any);
    savedJobServiceSpy.getSavedJobs.and.returnValue(of([]));
    profileServiceSpy.getResume.and.returnValue(of({ success: true, data: { skillsList: [] } } as any));

    await TestBed.configureTestingModule({
      imports: [JobListComponent],
      providers: [
        { provide: JobService, useValue: jobServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: SavedJobService, useValue: savedJobServiceSpy },
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load only OPEN jobs on init and set isLoading to false', () => {
    expect(component.jobs.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should filter out non-OPEN jobs', () => {
    const closed: any = { ...mockJobs[0], id: 99, status: 'CLOSED' };
    jobServiceSpy.searchJobs.and.returnValue(of({ success: true, data: [...mockJobs, closed] }) as any);
    component.loadJobs();
    expect(component.jobs.every((j: any) => j.status === 'OPEN')).toBeTrue();
    expect(component.jobs.length).toBe(2);
  });

  it('should handle loadJobs error gracefully', () => {
    jobServiceSpy.searchJobs.and.returnValue(throwError(() => new Error('Network error')));
    component.loadJobs();
    expect(component.isLoading).toBeFalse();
    expect(component.jobs.length).toBe(0);
  });

  describe('clearFilters()', () => {
    it('should reset all filter fields to default values', () => {
      component.keyword = 'Java';
      component.location = 'Hyderabad';
      component.minSalary = 20000;
      component.selectedType = 'FULL_TIME' as any;

      component.clearFilters();

      expect(component.keyword).toBe('');
      expect(component.location).toBe('');
      expect(component.minSalary).toBe(0);
      expect(component.selectedType).toBe('');
    });

    it('should call loadJobs after clearing filters', () => {
      spyOn(component, 'loadJobs');
      component.clearFilters();
      expect(component.loadJobs).toHaveBeenCalled();
    });
  });

  describe('isSaved()', () => {
    it('should return false for an unsaved job', () => {
      expect(component.isSaved(1)).toBeFalse();
    });

    it('should return true after saving a job locally', () => {
      component['savedJobIds'].add(1);
      expect(component.isSaved(1)).toBeTrue();
    });
  });

  describe('toggleSaveJob()', () => {
    it('should save job and add to savedJobIds', fakeAsync(() => {
      savedJobServiceSpy.saveJob.and.returnValue(of(undefined));
      component.toggleSaveJob(1);
      tick();
      expect(savedJobServiceSpy.saveJob).toHaveBeenCalledWith(5, 1);
      expect(component.isSaved(1)).toBeTrue();
    }));

    it('should unsave job and remove from savedJobIds', fakeAsync(() => {
      component['savedJobIds'].add(1);
      savedJobServiceSpy.unsaveJob.and.returnValue(of(undefined));
      component.toggleSaveJob(1);
      tick();
      expect(savedJobServiceSpy.unsaveJob).toHaveBeenCalledWith(5, 1);
      expect(component.isSaved(1)).toBeFalse();
    }));
  });

  describe('markRecentlyViewed()', () => {
    it('should add job ID to recentlyViewedIds at the front', () => {
      component.markRecentlyViewed(1);
      expect(component.recentlyViewedIds[0]).toBe(1);
    });

    it('should not create duplicate entries', () => {
      component.markRecentlyViewed(1);
      component.markRecentlyViewed(1);
      expect(component.recentlyViewedIds.filter(id => id === 1).length).toBe(1);
    });

    it('should keep most recently viewed at front', () => {
      component.markRecentlyViewed(1);
      component.markRecentlyViewed(2);
      expect(component.recentlyViewedIds[0]).toBe(2);
    });
  });

  describe('getSkillMatchPercent()', () => {
    it('should return 0 when seeker has no skills defined', () => {
      component.seekerSkills = [];
      expect(component.getSkillMatchPercent(mockJobs[0])).toBe(0);
    });

    it('should return 100 when all required skills match', () => {
      component.seekerSkills = ['java', 'spring'];
      expect(component.getSkillMatchPercent(mockJobs[0])).toBe(100);
    });

    it('should return 50 when half of skills match', () => {
      component.seekerSkills = ['java'];
      expect(component.getSkillMatchPercent(mockJobs[0])).toBe(50);
    });
  });

  describe('removePreset()', () => {
    it('should remove named preset from savedPresets', () => {
      component.savedPresets = [
        { name: 'preset1', filters: {} as any },
        { name: 'preset2', filters: {} as any }
      ];
      component.removePreset('preset1');
      expect(component.savedPresets.length).toBe(1);
      expect(component.savedPresets[0].name).toBe('preset2');
    });
  });

  describe('applyPreset()', () => {
    it('should apply all values from the preset', () => {
      const preset: any = {
        name: 'mypreset',
        filters: {
          keyword: 'Java', skillsKeyword: 'Spring', companyKeyword: 'Tech',
          location: 'Hyderabad', selectedType: 'FULL_TIME', workMode: 'REMOTE',
          experienceLevel: 'MID', minSalary: 10000, maxSalary: 50000,
          datePosted: '7D', industryType: 'IT', sortBy: 'SALARY_DESC'
        }
      };
      component.applyPreset(preset);
      expect(component.keyword).toBe('Java');
      expect(component.location).toBe('Hyderabad');
      expect(component.sortBy).toBe('SALARY_DESC');
    });
  });

  describe('triggerInstantSearch()', () => {
    it('should debounce and call onSearch after 300ms', fakeAsync(() => {
      spyOn(component, 'onSearch');
      component.triggerInstantSearch();
      tick(200);
      expect(component.onSearch).not.toHaveBeenCalled();
      tick(100);
      expect(component.onSearch).toHaveBeenCalledTimes(1);
    }));
  });
});
