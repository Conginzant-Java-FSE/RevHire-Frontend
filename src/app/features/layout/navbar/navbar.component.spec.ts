import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ProfileService } from '../../../core/services/profile.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let profileServiceSpy: jasmine.SpyObj<ProfileService>;
  let themeServiceMock: any;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'isAuthenticated', 'isJobSeeker', 'isEmployer']);
    (authServiceSpy as any).currentUser = signal({ id: 1, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' });
    (authServiceSpy as any).isAuthenticated = signal(true);
    authServiceSpy.isJobSeeker.and.returnValue(true);
    authServiceSpy.isEmployer.and.returnValue(false);

    profileServiceSpy = jasmine.createSpyObj('ProfileService', ['getUserById', 'changePassword']);
    profileServiceSpy.getUserById.and.returnValue(of({ success: true, data: { id: 1, name: 'J' } } as any));

    themeServiceMock = {
      isDarkMode: signal(false),
      toggleTheme: jasmine.createSpy('toggleTheme')
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: ProfileService, useValue: profileServiceSpy },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with menus closed', () => {
    expect(component.isMenuOpen).toBeFalse();
    expect(component.isProfileMenuOpen).toBeFalse();
  });

  describe('toggleMenu()', () => {
    it('should open menu when closed', () => {
      component.toggleMenu();
      expect(component.isMenuOpen).toBeTrue();
    });

    it('should close menu when open', () => {
      component.isMenuOpen = true;
      component.toggleMenu();
      expect(component.isMenuOpen).toBeFalse();
    });
  });

  describe('toggleProfileMenu()', () => {
    it('should open profile menu when closed', () => {
      component.toggleProfileMenu();
      expect(component.isProfileMenuOpen).toBeTrue();
    });

    it('should close profile menu when open', () => {
      component.isProfileMenuOpen = true;
      component.toggleProfileMenu();
      expect(component.isProfileMenuOpen).toBeFalse();
    });
  });

  describe('closeProfileMenu()', () => {
    it('should set isProfileMenuOpen to false', () => {
      component.isProfileMenuOpen = true;
      component.closeProfileMenu();
      expect(component.isProfileMenuOpen).toBeFalse();
    });
  });

  describe('logout()', () => {
    it('should call authService.logout()', () => {
      component.logout();
      expect(authServiceSpy.logout).toHaveBeenCalled();
    });

    it('should close both menus on logout', () => {
      component.isMenuOpen = true;
      component.isProfileMenuOpen = true;
      component.logout();
      expect(component.isMenuOpen).toBeFalse();
      expect(component.isProfileMenuOpen).toBeFalse();
    });
  });

  describe('onDocumentClick()', () => {
    it('should close profile menu when clicking outside the navbar', () => {
      component.isProfileMenuOpen = true;
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      component.onDocumentClick({ target: outsideElement } as unknown as MouseEvent);
      expect(component.isProfileMenuOpen).toBeFalse();

      document.body.removeChild(outsideElement);
    });
  });
});
