import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('Employer DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let jobServiceSpy: jasmine.SpyObj<JobService>;
  let profileServiceSpy: jasmine.SpyObj<ProfileService>;
  let statisticsServiceSpy: jasmine.SpyObj<StatisticsService>;

  const mockJobs: any[] = [
    {
      id: 1, title: 'Dev', status: 'OPEN', companyName: 'TC', location: 'Hyd',
      jobType: 'FULL_TIME', minSalary: 40000, maxSalary: 70000, applicationCount: 0
    }
  ];

  const mockAuthService = {
    currentUser: () => ({ id: 10, role: 'EMPLOYER', name: 'Emp', email: 'e@t.com', token: 't' }),
    isAuthenticated: () => true,
    isEmployer: () => true,
    isJobSeeker: () => false
  };
  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    jobServiceSpy = jasmine.createSpyObj('JobService', [
      'getJobsByEmployer', 'postJob', 'closeJob', 'reopenJob', 'markJobAsFilled',
      'updateJobStatus', 'getApplicationCount'
    ]);
    profileServiceSpy = jasmine.createSpyObj('ProfileService', ['getAllSeekers', 'searchResumesBySkill']);
    statisticsServiceSpy = jasmine.createSpyObj('StatisticsService', [
      'getEmployerStats', 'getJobAnalytics', 'getEmployerActivity'
    ]);

    jobServiceSpy.getJobsByEmployer.and.returnValue(of({ success: true, data: mockJobs } as any));
    jobServiceSpy.getApplicationCount.and.returnValue(of({ success: true, data: 5 } as any));
    jobServiceSpy.postJob.and.returnValue(of({ success: true, data: {} } as any));
    profileServiceSpy.getAllSeekers.and.returnValue(of({ success: true, data: [] } as any));
    statisticsServiceSpy.getEmployerStats.and.returnValue(of({ success: true, data: { totalJobs: 5 } } as any));
    statisticsServiceSpy.getJobAnalytics.and.returnValue(of({ success: true, data: { jobsByLocation: { Hyderabad: 3 } } } as any));
    statisticsServiceSpy.getEmployerActivity.and.returnValue(of({ success: true, data: {} } as any));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: JobService, useValue: jobServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: StatisticsService, useValue: statisticsServiceSpy },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load employer jobs on init', () => {
    expect(jobServiceSpy.getJobsByEmployer).toHaveBeenCalledWith(10);
    expect(component.jobs.length).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('should load all seekers on init', () => {
    expect(profileServiceSpy.getAllSeekers).toHaveBeenCalled();
  });

  it('should load analytics on init', () => {
    expect(statisticsServiceSpy.getEmployerStats).toHaveBeenCalledWith(10);
    expect(statisticsServiceSpy.getJobAnalytics).toHaveBeenCalled();
  });

  it('should handle job loading error gracefully', () => {
    jobServiceSpy.getJobsByEmployer.and.returnValue(throwError(() => new Error('error')));
    component.loadJobs();
    expect(component.isLoading).toBeFalse();
  });

  describe('searchSeekers()', () => {
    beforeEach(() => {
      component.allSeekers = [
        { id: 1, name: 'Alice', email: 'a@t.com', totalExperience: 3 },
        { id: 2, name: 'Bob', email: 'b@t.com', totalExperience: 7 }
      ];
    });

    it('should set hasSearched = true after search', () => {
      component.seekerSearchSkills = '';
      component.searchSeekers();
      expect(component.hasSearched).toBeTrue();
    });

    it('should filter seekers by min experience', () => {
      component.seekerSearchSkills = '';
      component.seekerSearchMinExp = '5';
      component.searchSeekers();
      expect(component.filteredSeekers.length).toBe(1);
      expect(component.filteredSeekers[0].name).toBe('Bob');
    });

    it('should filter seekers by max experience', () => {
      component.seekerSearchSkills = '';
      component.seekerSearchMaxExp = '5';
      component.searchSeekers();
      expect(component.filteredSeekers.length).toBe(1);
      expect(component.filteredSeekers[0].name).toBe('Alice');
    });
  });

  describe('clearSearch()', () => {
    it('should reset all search fields and results', () => {
      component.seekerSearchSkills = 'Java';
      component.filteredSeekers = [{ id: 1, name: 'Alice', email: 'a@t.com' }];
      component.hasSearched = true;

      component.clearSearch();

      expect(component.seekerSearchSkills).toBe('');
      expect(component.filteredSeekers.length).toBe(0);
      expect(component.hasSearched).toBeFalse();
    });
  });

  describe('duplicateJob()', () => {
    it('should call postJob with title containing (Copy)', fakeAsync(() => {
      component.duplicateJob(mockJobs[0]);
      tick();
      expect(jobServiceSpy.postJob).toHaveBeenCalled();
      const payload = jobServiceSpy.postJob.calls.mostRecent().args[0] as any;
      expect(payload.title).toContain('(Copy)');
    }));
  });
});
