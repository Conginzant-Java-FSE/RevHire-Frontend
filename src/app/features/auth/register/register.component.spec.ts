import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['register', 'sendOtp', 'isAuthenticated', 'isJobSeeker', 'isEmployer']);
    (authServiceSpy as any).currentUser = signal(null);
    (authServiceSpy as any).isAuthenticated = signal(false);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule, FormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty required fields', () => {
    expect(component.registerForm.get('name')?.value).toBe('');
    expect(component.registerForm.get('email')?.value).toBe('');
    expect(component.registerForm.get('password')?.value).toBe('');
    expect(component.registerForm.get('confirmPassword')?.value).toBe('');
  });

  it('should default selectedRole to JOB_SEEKER', () => {
    expect(component.selectedRole).toBe('JOB_SEEKER' as any);
  });

  it('should start with OTP not sent', () => {
    expect(component.otpSent).toBeFalse();
    expect(component.isSendingOtp).toBeFalse();
    expect(component.otpCode).toBe('');
  });

  describe('Form validation', () => {
    it('should be invalid when fields are empty', () => {
      expect(component.registerForm.valid).toBeFalse();
    });

    it('should validate email format', () => {
      component.registerForm.get('email')?.setValue('not-an-email');
      expect(component.registerForm.get('email')?.invalid).toBeTrue();

      component.registerForm.get('email')?.setValue('valid@test.com');
      expect(component.registerForm.get('email')?.valid).toBeTrue();
    });

    it('should reject password without uppercase', () => {
      component.registerForm.get('password')?.setValue('test@123');
      expect(component.registerForm.get('password')?.invalid).toBeTrue();
    });

    it('should accept password with uppercase, number, special char', () => {
      component.registerForm.get('password')?.setValue('Test@123');
      expect(component.registerForm.get('password')?.valid).toBeTrue();
    });
  });

  describe('setRole()', () => {
    it('should switch selectedRole to EMPLOYER', () => {
      component.setRole('EMPLOYER' as any);
      expect(component.selectedRole).toBe('EMPLOYER' as any);
    });
  });

  describe('sendOtp()', () => {
    it('should NOT call authService.sendOtp when email is invalid', () => {
      component.registerForm.get('email')?.setValue('');
      component.sendOtp();
      expect(authServiceSpy.sendOtp).not.toHaveBeenCalled();
    });

    it('should call authService.sendOtp with valid email and start countdown', fakeAsync(() => {
      component.registerForm.get('email')?.setValue('j@test.com');
      authServiceSpy.sendOtp.and.returnValue(of({ success: true, message: 'OTP sent' }));

      component.sendOtp();
      tick();

      expect(authServiceSpy.sendOtp).toHaveBeenCalledWith('j@test.com');
      expect(component.otpSent).toBeTrue();
      expect(component.otpCountdown).toBe(60);
      component.ngOnDestroy();
    }));

    it('should set isSendingOtp to false and otpSent stays false on error', fakeAsync(() => {
      component.registerForm.get('email')?.setValue('j@test.com');
      authServiceSpy.sendOtp.and.returnValue(throwError(() => ({ error: { message: 'Failed' } })));

      component.sendOtp();
      tick();

      expect(component.isSendingOtp).toBeFalse();
      expect(component.otpSent).toBeFalse();
    }));
  });

  describe('onSubmit()', () => {
    it('should NOT submit when form is invalid', () => {
      component.onSubmit();
      expect(authServiceSpy.register).not.toHaveBeenCalled();
    });

    it('should NOT submit when OTP has not been sent', () => {
      component.registerForm.patchValue({ name: 'J', email: 'j@test.com', password: 'Test@1', confirmPassword: 'Test@1', role: 'JOB_SEEKER' });
      component.otpSent = false;
      component.onSubmit();
      expect(authServiceSpy.register).not.toHaveBeenCalled();
    });

    it('should NOT submit when OTP code is empty', () => {
      component.registerForm.patchValue({ name: 'J', email: 'j@test.com', password: 'Test@1', confirmPassword: 'Test@1', role: 'JOB_SEEKER' });
      component.otpSent = true;
      component.otpCode = '';
      component.onSubmit();
      expect(authServiceSpy.register).not.toHaveBeenCalled();
    });

    it('should NOT submit when confirm password does not match', () => {
      component.registerForm.patchValue({
        name: 'J',
        email: 'j@test.com',
        password: 'Test@123',
        confirmPassword: 'Test@321',
        role: 'JOB_SEEKER'
      });
      component.otpSent = true;
      component.otpCode = '123456';
      component.onSubmit();
      expect(authServiceSpy.register).not.toHaveBeenCalled();
    });

    it('should include otpCode in register payload when all conditions met', fakeAsync(() => {
      component.registerForm.patchValue({ name: 'J', email: 'j@test.com', password: 'Test@123', confirmPassword: 'Test@123', role: 'JOB_SEEKER' });
      component.otpSent = true;
      component.otpCode = '123456';

      authServiceSpy.register.and.returnValue(of({
        success: true, message: 'OK',
        data: { id: 1, name: 'J', email: 'j@test.com', role: 'JOB_SEEKER' as any, token: 't' }
      }));

      component.onSubmit();
      tick();

      expect(authServiceSpy.register).toHaveBeenCalled();
      const payload = authServiceSpy.register.calls.mostRecent().args[0] as any;
      expect(payload.otpCode).toBe('123456');
      expect(payload.confirmPassword).toBeUndefined();
    }));
  });

  describe('countdown timer', () => {
    it('should decrement countdown each second', fakeAsync(() => {
      component.registerForm.get('email')?.setValue('j@test.com');
      authServiceSpy.sendOtp.and.returnValue(of({ success: true }));

      component.sendOtp();
      tick();
      expect(component.otpCountdown).toBe(60);

      tick(3000);
      expect(component.otpCountdown).toBe(57);

      component.ngOnDestroy();
    }));
  });
});
