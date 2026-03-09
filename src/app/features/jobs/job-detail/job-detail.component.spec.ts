import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { JobDetailComponent } from './job-detail.component';
import { JobService } from '../../../core/services/job.service';
import { ApplicationService } from '../../../core/services/application.service';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('JobDetailComponent', () => {
  let component: JobDetailComponent;
  let fixture: ComponentFixture<JobDetailComponent>;
  let jobServiceSpy: jasmine.SpyObj<JobService>;
  let appServiceSpy: jasmine.SpyObj<ApplicationService>;
  let savedJobServiceSpy: jasmine.SpyObj<SavedJobService>;

  const mockJob: any = {
    id: 5, title: 'Backend Dev', companyName: 'TechCorp', location: 'Hyd',
    jobType: 'FULL_TIME', status: 'OPEN', description: 'Great job',
    skills: ['Java', 'Spring'], minSalary: 40000, maxSalary: 70000
  };

  const mockAuthService = {
    currentUser: () => ({ id: 3, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' }),
    isAuthenticated: () => true,
    isJobSeeker: () => true,
    isEmployer: () => false
  };
  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    jobServiceSpy = jasmine.createSpyObj('JobService', ['getJobById', 'incrementViewCount']);
    appServiceSpy = jasmine.createSpyObj('ApplicationService', ['applyForJob', 'getApplicationsBySeeker']);
    savedJobServiceSpy = jasmine.createSpyObj('SavedJobService', ['getSavedJobs', 'saveJob', 'unsaveJob']);

    jobServiceSpy.getJobById.and.returnValue(of({ success: true, data: mockJob } as any));
    jobServiceSpy.incrementViewCount.and.returnValue(of({} as any));
    appServiceSpy.getApplicationsBySeeker.and.returnValue(of({ success: true, data: [] } as any));
    savedJobServiceSpy.getSavedJobs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [JobDetailComponent],
      providers: [
        { provide: JobService, useValue: jobServiceSpy },
        { provide: ApplicationService, useValue: appServiceSpy },
        { provide: SavedJobService, useValue: savedJobServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '5' } }, params: of({ id: '5' }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load job details on init', () => {
    expect(jobServiceSpy.getJobById).toHaveBeenCalled();
  });

  it('should display job data after loading', () => {
    expect(component.job?.title).toBe('Backend Dev');
    expect(component.job?.location).toBe('Hyd');
  });

  it('should set isLoading to false after job loads', () => {
    expect(component.isLoading).toBeFalse();
  });

  it('should handle job loading error gracefully', () => {
    jobServiceSpy.getJobById.and.returnValue(throwError(() => new Error('not found')));
    component.isLoading = true;
    component.ngOnInit();
    expect(component.isLoading).toBeFalse();
  });
});
