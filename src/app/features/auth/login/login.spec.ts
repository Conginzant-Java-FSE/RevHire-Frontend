import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    (authServiceSpy as any).currentUser = signal(null);
    (authServiceSpy as any).isAuthenticated = signal(false);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty email and password', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should start with isLoading = false', () => {
    expect(component.isLoading).toBeFalse();
  });

  describe('Form validation', () => {
    it('should be invalid when empty', () => {
      expect(component.loginForm.valid).toBeFalse();
    });

    it('should be invalid with wrong email format', () => {
      component.loginForm.patchValue({ email: 'notanemail', password: 'Test@123' });
      expect(component.loginForm.get('email')?.invalid).toBeTrue();
    });

    it('should be valid with correct credentials format', () => {
      component.loginForm.patchValue({ email: 'j@test.com', password: 'Test@123' });
      expect(component.loginForm.valid).toBeTrue();
    });

    it('should require email', () => {
      const emailCtrl = component.loginForm.get('email');
      emailCtrl?.setValue('');
      emailCtrl?.markAsTouched();
      expect(emailCtrl?.errors?.['required']).toBeTruthy();
    });

    it('should require password', () => {
      const passCtrl = component.loginForm.get('password');
      passCtrl?.setValue('');
      passCtrl?.markAsTouched();
      expect(passCtrl?.errors?.['required']).toBeTruthy();
    });
  });

  describe('onSubmit()', () => {
    it('should not call login when form is invalid', () => {
      component.loginForm.patchValue({ email: '', password: '' });
      component.onSubmit();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should call authService.login with form values', fakeAsync(() => {
      component.loginForm.patchValue({ email: 'j@test.com', password: 'Test@123' });
      authServiceSpy.login.and.returnValue(of({
        success: true, message: 'Login successful',
        data: { id: 1, name: 'Jahnavi', email: 'j@test.com', role: 'JOB_SEEKER' as any, token: 'jwt' }
      }));

      component.onSubmit();
      tick();

      expect(authServiceSpy.login).toHaveBeenCalledWith({ email: 'j@test.com', password: 'Test@123' });
    }));

    it('should set isLoading = false on error', fakeAsync(() => {
      component.loginForm.patchValue({ email: 'j@test.com', password: 'wrong' });
      authServiceSpy.login.and.returnValue(throwError(() => ({ error: { message: 'Invalid credentials' } })));

      component.onSubmit();
      tick();

      expect(component.isLoading).toBeFalse();
    }));
  });
});
