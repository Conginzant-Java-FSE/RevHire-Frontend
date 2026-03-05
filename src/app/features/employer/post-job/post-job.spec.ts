import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PostJobComponent } from './post-job.component';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('PostJobComponent', () => {
  let component: PostJobComponent;
  let fixture: ComponentFixture<PostJobComponent>;
  let jobServiceSpy: jasmine.SpyObj<JobService>;

  const mockAuthService = {
    currentUser: () => ({ id: 10, role: 'EMPLOYER', name: 'Emp', email: 'e@t.com', token: 't' }),
    isAuthenticated: signal(true),
    isEmployer: () => true,
    isJobSeeker: () => false
  };

  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    jobServiceSpy = jasmine.createSpyObj('JobService', ['postJob']);

    await TestBed.configureTestingModule({
      imports: [PostJobComponent, ReactiveFormsModule],
      providers: [
        { provide: JobService, useValue: jobServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PostJobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize jobForm with default values', () => {
    expect(component.jobForm.get('title')?.value).toBe('');
    expect(component.jobForm.get('location')?.value).toBe('');
    expect(component.jobForm.get('minSalary')?.value).toBe(0);
    expect(component.jobForm.get('numberOfOpenings')?.value).toBe(1);
  });

  it('should start with empty skills list', () => {
    expect(component.skills).toEqual([]);
  });

  it('should start with isLoading = false', () => {
    expect(component.isLoading).toBeFalse();
  });

  describe('addSkill()', () => {
    it('should add a skill to the skills list', () => {
      component.skillInput = 'Java';
      component.addSkill();
      expect(component.skills).toContain('Java');
    });

    it('should clear skillInput after adding', () => {
      component.skillInput = 'Spring';
      component.addSkill();
      expect(component.skillInput).toBe('');
    });

    it('should not add duplicate skill', () => {
      component.skillInput = 'Java';
      component.addSkill();
      component.skillInput = 'Java';
      component.addSkill();
      expect(component.skills.filter(s => s === 'Java').length).toBe(1);
    });

    it('should not add empty skill', () => {
      component.skillInput = '   ';
      component.addSkill();
      expect(component.skills.length).toBe(0);
    });
  });

  describe('removeSkill()', () => {
    it('should remove a skill by name', () => {
      component.skills = ['Java', 'Spring', 'Angular'];
      component.removeSkill('Spring');
      expect(component.skills).not.toContain('Spring');
      expect(component.skills.length).toBe(2);
    });
  });

  describe('onSubmit()', () => {
    it('should mark all as touched when form is invalid', () => {
      spyOn(component.jobForm, 'markAllAsTouched');
      component.onSubmit();
      expect(component.jobForm.markAllAsTouched).toHaveBeenCalled();
    });

    it('should not call postJob when form is invalid', () => {
      component.onSubmit();
      expect(jobServiceSpy.postJob).not.toHaveBeenCalled();
    });

    it('should call jobService.postJob with employerId when form and skills are valid', fakeAsync(() => {
      component.jobForm.patchValue({
        title: 'Backend Dev', description: 'Great role', location: 'Hyderabad',
        minExperienceYears: 2, maxExperienceYears: 5,
        requiredEducationLevel: 'B.Tech', minSalary: 30000, maxSalary: 70000,
        jobType: 'FULL_TIME', deadline: '2025-12-31', numberOfOpenings: 2
      });
      component.skills = ['Java'];

      jobServiceSpy.postJob.and.returnValue(of({ success: true, message: 'Posted', data: {} as any }));

      component.onSubmit();
      tick();

      expect(jobServiceSpy.postJob).toHaveBeenCalled();
      const payload = jobServiceSpy.postJob.calls.mostRecent().args[0] as any;
      expect(payload.employerId).toBe(10);
      expect(payload.skills).toEqual(['Java']);
    }));

    it('should set isLoading = false on error', fakeAsync(() => {
      component.jobForm.patchValue({
        title: 'Dev', description: 'Desc', location: 'Hyd',
        minExperienceYears: 0, maxExperienceYears: 2,
        requiredEducationLevel: 'B.Tech', minSalary: 0, maxSalary: 50000,
        jobType: 'FULL_TIME', deadline: '2025-12-31', numberOfOpenings: 1
      });
      component.skills = ['Java'];

      jobServiceSpy.postJob.and.returnValue(throwError(() => ({ error: { message: 'Error' } })));

      component.onSubmit();
      tick();

      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('Form validation', () => {
    it('should be invalid with empty required fields', () => {
      expect(component.jobForm.valid).toBeFalse();
    });

    it('should be valid with all required fields filled', () => {
      component.jobForm.patchValue({
        title: 'Dev', description: 'Something', location: 'Hyd',
        minExperienceYears: 1, maxExperienceYears: 3,
        requiredEducationLevel: 'B.Tech', minSalary: 20000, maxSalary: 50000,
        jobType: 'FULL_TIME', deadline: '2025-12-31', numberOfOpenings: 1
      });
      expect(component.jobForm.valid).toBeTrue();
    });
  });
});
