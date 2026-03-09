import { TestBed } from '@angular/core/testing';
import { CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  let authServiceMock: any;
  let routerSpy: any;

  const makeRoute = (data: Record<string, any> = {}): ActivatedRouteSnapshot => {
    const route = new ActivatedRouteSnapshot();
    (route as any).data = data;
    return route;
  };

  const stateSnapshot = { url: '/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: signal(false),
      currentUser: signal(null)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([])
      ]
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should return false and redirect to login when not authenticated', () => {
    authServiceMock.isAuthenticated.set(false);
    const result = executeGuard(makeRoute(), stateSnapshot);
    expect(result).toBeFalse();
  });

  it('should return true when authenticated with no role restriction', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.currentUser.set({ id: 1, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' });
    const result = executeGuard(makeRoute(), stateSnapshot);
    expect(result).toBeTrue();
  });

  it('should return false when user has wrong required role', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.currentUser.set({ id: 1, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' });
    const result = executeGuard(makeRoute({ role: 'EMPLOYER' }), stateSnapshot);
    expect(result).toBeFalse();
  });

  it('should return true when user has the correct required role', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.currentUser.set({ id: 1, role: 'EMPLOYER', name: 'E', email: 'e@t.com', token: 't' });
    const result = executeGuard(makeRoute({ role: 'EMPLOYER' }), stateSnapshot);
    expect(result).toBeTrue();
  });

  it('should return false when user role is in blockedRoles', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.currentUser.set({ id: 1, role: 'EMPLOYER', name: 'E', email: 'e@t.com', token: 't' });
    const result = executeGuard(makeRoute({ blockedRoles: ['EMPLOYER'] }), stateSnapshot);
    expect(result).toBeFalse();
  });

  it('should return true when user role is NOT in blockedRoles', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.currentUser.set({ id: 1, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' });
    const result = executeGuard(makeRoute({ blockedRoles: ['EMPLOYER'] }), stateSnapshot);
    expect(result).toBeTrue();
  });
});
