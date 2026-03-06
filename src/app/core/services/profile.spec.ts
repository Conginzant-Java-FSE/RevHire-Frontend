import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { environment } from '../../../environments/environment';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;
  const userApiUrl = `${environment.apiUrl}/users`;
  const resumeApiUrl = `${environment.apiUrl}/resumes`;

  const mockUser: any = {
    id: 1, name: 'Jahnavi', email: 'j@test.com', role: 'JOB_SEEKER', location: 'Hyd'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProfileService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentProfile()', () => {
    it('should GET /users/me', () => {
      service.getCurrentProfile().subscribe(res => {
        expect(res.data?.name).toBe('Jahnavi');
      });
      const req = httpMock.expectOne(`${userApiUrl}/me`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockUser });
    });
  });

  describe('getUserById()', () => {
    it('should GET /users/:id', () => {
      service.getUserById(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      const req = httpMock.expectOne(`${userApiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockUser });
    });
  });

  describe('updateMyProfile()', () => {
    it('should PUT /users/me with profile data', () => {
      service.updateMyProfile({ name: 'Updated' } as any).subscribe(res => {
        expect(res.data?.name).toBe('Updated');
      });
      const req = httpMock.expectOne(`${userApiUrl}/me`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.name).toBe('Updated');
      req.flush({ success: true, data: { ...mockUser, name: 'Updated' } });
    });
  });

  describe('changePassword()', () => {
    it('should PUT /users/:id/change-password with params', () => {
      service.changePassword(1, 'old123', 'New@456').subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${userApiUrl}/1/change-password` &&
        r.params.get('oldPassword') === 'old123' &&
        r.params.get('newPassword') === 'New@456'
      );
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true, message: 'Password changed' });
    });
  });

  describe('getResume()', () => {
    it('should GET /resumes/user/:id', () => {
      const mockResume: any = { id: 1, educationList: [], skillsList: [] };
      service.getResume(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      const req = httpMock.expectOne(`${resumeApiUrl}/user/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockResume });
    });
  });

  describe('getAllEmployers() / getAllSeekers()', () => {
    it('should GET /users/employers', () => {
      service.getAllEmployers().subscribe(res => {
        expect(res.data?.length).toBe(1);
      });
      const req = httpMock.expectOne(`${userApiUrl}/employers`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockUser] });
    });

    it('should GET /users/seekers', () => {
      service.getAllSeekers().subscribe();
      const req = httpMock.expectOne(`${userApiUrl}/seekers`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockUser] });
    });
  });

  describe('activateAccount() / deactivateAccount()', () => {
    it('should PUT /users/:id/activate', () => {
      service.activateAccount(1).subscribe();
      const req = httpMock.expectOne(`${userApiUrl}/1/activate`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true });
    });

    it('should PUT /users/:id/deactivate', () => {
      service.deactivateAccount(1).subscribe();
      const req = httpMock.expectOne(`${userApiUrl}/1/deactivate`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true });
    });
  });

  describe('searchUsers()', () => {
    it('should GET /users/search with query param', () => {
      service.searchUsers('Jah').subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${userApiUrl}/search` && r.params.get('query') === 'Jah'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockUser] });
    });
  });

  describe('Resume CRUD', () => {
    it('addEducation() should POST /resumes/user/:id/education', () => {
      service.addEducation(1, { institution: 'MIT', degree: 'B.Tech' }).subscribe();
      const req = httpMock.expectOne(`${resumeApiUrl}/user/1/education`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('deleteSkill() should DELETE /resumes/skills/:id', () => {
      service.deleteSkill(5).subscribe();
      const req = httpMock.expectOne(`${resumeApiUrl}/skills/5`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });

    it('addExperience() should POST /resumes/user/:id/experience', () => {
      service.addExperience(1, { company: 'TechCorp', role: 'Dev' }).subscribe();
      const req = httpMock.expectOne(`${resumeApiUrl}/user/1/experience`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('uploadResumeFile() should POST /resumes/user/:id/upload as FormData', () => {
      const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      service.uploadResumeFile(1, file).subscribe();
      const req = httpMock.expectOne(`${resumeApiUrl}/user/1/upload`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      req.flush({ success: true, data: {} });
    });
  });
});
