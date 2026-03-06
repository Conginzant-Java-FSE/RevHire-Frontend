import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpRequest, HttpHandlerFn, HttpContext, HttpParams } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { provideRouter } from '@angular/router';

describe('authInterceptor', () => {
  let authServiceMock: jasmine.SpyObj<AuthService>;

  function makeGetReq(url: string): HttpRequest<null> {
    return new HttpRequest<null>('GET', url, null);
  }
  function makePostReq(url: string): HttpRequest<null> {
    return new HttpRequest<null>('POST', url, null);
  }

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['getToken', 'isAuthenticated', 'isJobSeeker', 'isEmployer', 'logout']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
  });

  it('should be created', () => {
    expect(authInterceptor).toBeTruthy();
  });

  it('should add Authorization header when token exists and not an auth endpoint', () => {
    authServiceMock.getToken.and.returnValue('test-jwt-token');
    const req = makeGetReq('/api/jobs');

    let capturedReq: HttpRequest<unknown> | null = null;
    const next: HttpHandlerFn = (r) => { capturedReq = r as any; return of(r as any); };

    TestBed.runInInjectionContext(() => authInterceptor(req, next));

    expect(capturedReq).toBeTruthy();
    expect((capturedReq as any).headers.get('Authorization')).toBe('Bearer test-jwt-token');
  });

  it('should NOT add Authorization header when there is no token', () => {
    authServiceMock.getToken.and.returnValue(null);
    const req = makeGetReq('/api/jobs');

    let capturedReq: HttpRequest<unknown> | null = null;
    const next: HttpHandlerFn = (r) => { capturedReq = r as any; return of(r as any); };

    TestBed.runInInjectionContext(() => authInterceptor(req, next));

    expect((capturedReq as any).headers.has('Authorization')).toBeFalse();
  });

  it('should NOT add Authorization header for /api/auth/ endpoints even with token', () => {
    authServiceMock.getToken.and.returnValue('test-jwt-token');
    const req = makePostReq('/api/auth/login');

    let capturedReq: HttpRequest<unknown> | null = null;
    const next: HttpHandlerFn = (r) => { capturedReq = r as any; return of(r as any); };

    TestBed.runInInjectionContext(() => authInterceptor(req, next));

    expect((capturedReq as any).headers.has('Authorization')).toBeFalse();
  });

  it('should NOT add Authorization header for send-otp auth endpoint', () => {
    authServiceMock.getToken.and.returnValue('test-jwt-token');
    const req = makePostReq('/api/auth/send-otp');

    let capturedReq: HttpRequest<unknown> | null = null;
    const next: HttpHandlerFn = (r) => { capturedReq = r as any; return of(r as any); };

    TestBed.runInInjectionContext(() => authInterceptor(req, next));

    expect((capturedReq as any).headers.has('Authorization')).toBeFalse();
  });
});
