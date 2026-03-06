import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('Auth', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/auth`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have no authenticated user initially (empty localStorage)', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  describe('register()', () => {
    it('should POST to /auth/register and store session on success', () => {
      const payload: any = { name: 'Jahnavi', email: 'j@test.com', password: 'Test@1', role: 'JOB_SEEKER' };
      const mockResponse = {
        success: true,
        message: 'Registration successful',
        data: { id: 1, name: 'Jahnavi', email: 'j@test.com', role: 'JOB_SEEKER', token: 'mock-token' }
      };

      service.register(payload).subscribe(res => {
        expect(res.success).toBeTrue();
        expect(service.isAuthenticated()).toBeTrue();
        expect(localStorage.getItem('auth_token')).toBe('mock-token');
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('login()', () => {
    it('should POST to /auth/login and persist session', () => {
      const credentials = { email: 'j@test.com', password: 'Test@1' };
      const mockResponse = {
        success: true,
        message: 'Login successful',
        data: { id: 1, name: 'Jahnavi', email: 'j@test.com', role: 'JOB_SEEKER', token: 'jwt-token' }
      };

      service.login(credentials).subscribe(res => {
        expect(res.success).toBeTrue();
        expect(service.isAuthenticated()).toBeTrue();
        expect(service.currentUser()?.email).toBe('j@test.com');
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('sendOtp()', () => {
    it('should POST to /auth/send-otp with email as query param', () => {
      const email = 'j@test.com';
      service.sendOtp(email).subscribe();

      const req = httpMock.expectOne(r => r.url === `${apiUrl}/send-otp`);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('email')).toBe(email);
      req.flush({ success: true, message: 'OTP sent' });
    });
  });

  describe('logout()', () => {
    it('should clear localStorage and reset signals', () => {
      localStorage.setItem('auth_token', 'some-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: 1, email: 'j@test.com' }));
      service.currentUser.set({ id: 1, name: 'J', email: 'j@test.com', role: 'JOB_SEEKER' as any, token: 'some-token' });
      service.isAuthenticated.set(true);

      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('getToken()', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('auth_token', 'test-token-123');
      expect(service.getToken()).toBe('test-token-123');
    });

    it('should return null when no token stored', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isJobSeeker() / isEmployer()', () => {
    it('should correctly identify JOB_SEEKER role', () => {
      service.currentUser.set({ id: 1, role: 'JOB_SEEKER' as any, name: 'Test', email: 't@t.com', token: 't' });
      expect(service.isJobSeeker()).toBeTrue();
      expect(service.isEmployer()).toBeFalse();
    });

    it('should correctly identify EMPLOYER role', () => {
      service.currentUser.set({ id: 2, role: 'EMPLOYER' as any, name: 'Emp', email: 'e@t.com', token: 't' });
      expect(service.isEmployer()).toBeTrue();
      expect(service.isJobSeeker()).toBeFalse();
    });

    it('should return false when no user is set', () => {
      service.currentUser.set(null);
      expect(service.isJobSeeker()).toBeFalse();
      expect(service.isEmployer()).toBeFalse();
    });
  });
});
