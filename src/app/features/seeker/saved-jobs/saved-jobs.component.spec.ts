import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { SavedJobsComponent } from './saved-jobs.component';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('SavedJobsComponent', () => {
  let component: SavedJobsComponent;
  let fixture: ComponentFixture<SavedJobsComponent>;
  let savedJobServiceSpy: jasmine.SpyObj<SavedJobService>;

  const mockSavedJobs: any[] = [
    { id: 1, title: 'Dev', companyName: 'TC', location: 'Hyd', jobType: 'FULL_TIME', status: 'OPEN' },
    { id: 2, title: 'Designer', companyName: 'UI', location: 'Mum', jobType: 'CONTRACT', status: 'OPEN' }
  ];

  const mockAuthService = {
    currentUser: () => ({ id: 5, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' }),
    isAuthenticated: () => true,
    isJobSeeker: () => true,
    isEmployer: () => false
  };
  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    savedJobServiceSpy = jasmine.createSpyObj('SavedJobService', ['getSavedJobs', 'unsaveJob']);
    savedJobServiceSpy.getSavedJobs.and.returnValue(of(mockSavedJobs));
    savedJobServiceSpy.unsaveJob.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [SavedJobsComponent],
      providers: [
        { provide: SavedJobService, useValue: savedJobServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SavedJobsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load saved jobs on init', () => {
    expect(savedJobServiceSpy.getSavedJobs).toHaveBeenCalledWith(5);
    expect(component.savedJobs.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle error gracefully when loading saved jobs', () => {
    savedJobServiceSpy.getSavedJobs.and.returnValue(throwError(() => new Error('error')));
    component.loadSavedJobs();
    expect(component.isLoading).toBeFalse();
    expect(component.savedJobs.length).toBe(0);
  });

  describe('unsaveJob()', () => {
    it('should remove job from savedJobs list after unsave', fakeAsync(() => {
      component.unsaveJob(1);
      tick();

      expect(savedJobServiceSpy.unsaveJob).toHaveBeenCalledWith(5, 1);
      expect(component.savedJobs.find(j => j.id === 1)).toBeUndefined();
      expect(component.savedJobs.length).toBe(1);
    }));

    it('should keep remaining jobs after unsave', fakeAsync(() => {
      component.unsaveJob(1);
      tick();
      expect(component.savedJobs[0].id).toBe(2);
    }));
  });
});
