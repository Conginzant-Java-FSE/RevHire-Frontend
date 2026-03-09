import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { JobApplicantsComponent } from './job-applicants.component';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('JobApplicantsComponent', () => {
  let component: JobApplicantsComponent;
  let fixture: ComponentFixture<JobApplicantsComponent>;
  let appServiceSpy: jasmine.SpyObj<ApplicationService>;
  let jobServiceSpy: jasmine.SpyObj<JobService>;

  const mockApplications: any[] = [
    { id: 1, jobId: 10, seekerId: 5, status: 'APPLIED', appliedAt: new Date().toISOString() },
    { id: 2, jobId: 10, seekerId: 6, status: 'SHORTLISTED', appliedAt: new Date().toISOString() }
  ];

  const mockAuthService = {
    currentUser: () => ({ id: 10, role: 'EMPLOYER', name: 'E', email: 'e@t.com', token: 't' }),
    isAuthenticated: () => true,
    isEmployer: () => true,
    isJobSeeker: () => false
  };
  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    appServiceSpy = jasmine.createSpyObj('ApplicationService', [
      'getApplicationsByJob', 'updateApplicationStatus', 'bulkUpdateStatus', 'getFullApplication'
    ]);
    jobServiceSpy = jasmine.createSpyObj('JobService', ['getJobById']);

    appServiceSpy.getApplicationsByJob.and.returnValue(of({ success: true, data: mockApplications } as any));
    jobServiceSpy.getJobById.and.returnValue(of({ success: true, data: { id: 10, title: 'Dev' } } as any));

    await TestBed.configureTestingModule({
      imports: [JobApplicantsComponent],
      providers: [
        { provide: ApplicationService, useValue: appServiceSpy },
        { provide: JobService, useValue: jobServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '10' } }, params: of({ id: '10' }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobApplicantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load applications for the job on init', () => {
    expect(appServiceSpy.getApplicationsByJob).toHaveBeenCalled();
  });

  it('should start with isLoading = false after data loads', () => {
    expect(component.isLoading).toBeFalse();
  });
});
