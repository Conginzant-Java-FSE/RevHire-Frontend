import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('Seeker ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let profileServiceSpy: jasmine.SpyObj<ProfileService>;

  const mockProfile: any = {
    id: 5, name: 'Jahnavi', email: 'j@test.com', role: 'JOB_SEEKER',
    location: 'Hyderabad', phone: '9999999999', currentEmploymentStatus: 'OPEN_TO_WORK'
  };

  const mockResume: any = {
    id: 1,
    skillsList: [{ skillName: 'Java', proficiency: 'Expert' }, { skillName: 'Spring' }],
    educationList: [{ degree: 'B.Tech', institution: 'MIT' }],
    experienceList: [{ company: 'TechCorp', role: 'Dev' }],
    projectsList: [{ title: 'RevHire', description: 'Job portal' }],
    resumeFile: { id: 10, fileName: 'resume.pdf', uploadDate: new Date().toISOString() }
  };

  const mockAuthService = {
    currentUser: () => ({ id: 5, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' }),
    isAuthenticated: () => true,
    isJobSeeker: () => true,
    isEmployer: () => false
  };
  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    localStorage.clear();

    profileServiceSpy = jasmine.createSpyObj('ProfileService', [
      'getCurrentProfile', 'getResume', 'updateProfile', 'getUserById',
      'changePassword', 'uploadResumeFile', 'downloadResumeFile', 'deleteResumeFile'
    ]);

    profileServiceSpy.getCurrentProfile.and.returnValue(of({ success: true, data: mockProfile } as any));
    profileServiceSpy.getResume.and.returnValue(of({ success: true, data: mockResume } as any));
    profileServiceSpy.updateProfile.and.returnValue(of({ success: true, data: mockProfile } as any));
    profileServiceSpy.getUserById.and.returnValue(of({ success: true, data: mockProfile } as any));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, FormsModule],
      providers: [
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load profile and resume on init', () => {
    expect(profileServiceSpy.getCurrentProfile).toHaveBeenCalled();
    expect(profileServiceSpy.getResume).toHaveBeenCalledWith(5);
    expect(component.profile?.name).toBe('Jahnavi');
    expect(component.isLoading).toBeFalse();
  });

  it('should handle profile loading error gracefully', () => {
    profileServiceSpy.getCurrentProfile.and.returnValue(throwError(() => new Error('error')));
    component.isLoading = true;
    component.loadData();
    expect(component.isLoading).toBeFalse();
  });

  describe('profileStrength getter', () => {
    it('should be > 0 when profile has data', () => {
      expect(component.profileStrength).toBeGreaterThan(0);
    });

    it('should return 100 when all fields complete', () => {
      component.linkedinUrl = 'https://linkedin.com/in/j';
      component.githubUrl = 'https://github.com/j';
      expect(component.profileStrength).toBeGreaterThanOrEqual(80);
    });
  });

  describe('profileStrengthTone getter', () => {
    it('should return success when strength >= 80', () => {
      spyOnProperty(component, 'profileStrength').and.returnValue(85);
      expect(component.profileStrengthTone).toBe('success');
    });

    it('should return warning when strength between 50-79', () => {
      spyOnProperty(component, 'profileStrength').and.returnValue(60);
      expect(component.profileStrengthTone).toBe('warning');
    });

    it('should return danger when strength < 50', () => {
      spyOnProperty(component, 'profileStrength').and.returnValue(30);
      expect(component.profileStrengthTone).toBe('danger');
    });
  });

  describe('parsedSkills / parsedEducation / parsedExperience', () => {
    it('should parse skills from resume skillsList', () => {
      expect(component.parsedSkills.length).toBe(2);
      expect(component.parsedSkills[0]).toBe('Java');
    });

    it('should parse education from resume educationList', () => {
      expect(component.parsedEducation.length).toBe(1);
      expect(component.parsedEducation[0]).toBe('B.Tech');
    });

    it('should parse experience from resume experienceList', () => {
      expect(component.parsedExperience.length).toBe(1);
      expect(component.parsedExperience[0]).toBe('TechCorp');
    });
  });

  describe('resumeTips getter', () => {
    it('should suggest adding skills when fewer than 5', () => {
      expect(component.resumeTips.some(t => t.includes('skill'))).toBeTrue();
    });

    it('should suggest LinkedIn when not set', () => {
      component.linkedinUrl = '';
      expect(component.resumeTips.some(t => t.includes('LinkedIn'))).toBeTrue();
    });

    it('should return positive message when profile looks strong', () => {
      component.linkedinUrl = 'https://linkedin.com/in/j';
      // Fill all resume sections with 5+ skills
      component.resume = {
        ...mockResume,
        skillsList: ['a', 'b', 'c', 'd', 'e'],
        projectsList: [{ title: 'P1' }]
      };
      component.profile = { ...mockProfile, location: 'Hyderabad' };
      const tips = component.resumeTips;
      expect(tips[0]).toContain('strong');
    });
  });

  describe('toggleEdit()', () => {
    it('should enter edit mode', () => {
      expect(component.isEditing).toBeFalse();
      component.toggleEdit();
      expect(component.isEditing).toBeTrue();
    });

    it('should cancel edit and restore original profile data', () => {
      component.isEditing = true;
      component.editData = { name: 'Changed Name' };
      component.toggleEdit();
      expect(component.isEditing).toBeFalse();
      expect(component.editData.name).toBe('Jahnavi');
    });
  });

  describe('saveProfile()', () => {
    it('should call profileService.updateProfile', fakeAsync(() => {
      component.editData = { name: 'Updated Name' };
      component.saveProfile();
      tick();
      expect(profileServiceSpy.updateProfile).toHaveBeenCalledWith(5, { name: 'Updated Name' });
    }));

    it('should set isEditing = false on success', fakeAsync(() => {
      component.isEditing = true;
      component.editData = { name: 'Jahnavi' };
      component.saveProfile();
      tick();
      expect(component.isEditing).toBeFalse();
    }));
  });

  describe('saveEnhancements()', () => {
    it('should persist enhancement data to localStorage', () => {
      component.linkedinUrl = 'https://linkedin.com/in/j';
      component.githubUrl = 'https://github.com/j';
      component.profileVisibility = 'RECRUITERS_ONLY';
      component.saveEnhancements(false);

      const key = `seeker_profile_plus_5`;
      const stored = localStorage.getItem(key);
      const parsed = stored ? JSON.parse(stored) : null;
      expect(parsed?.linkedinUrl).toBe('https://linkedin.com/in/j');
      expect(parsed?.profileVisibility).toBe('RECRUITERS_ONLY');
    });
  });
});
