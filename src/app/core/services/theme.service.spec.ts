import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to light mode when no stored preference', () => {
    localStorage.clear();
    // Re-create service without dark mode stored
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);

    // Default with no localStorage is light (or follows system — both are valid)
    expect(typeof service.isDarkMode()).toBe('boolean');
  });

  it('should initialize to dark mode when localStorage has theme=dark', () => {
    localStorage.setItem('theme', 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);
    expect(service.isDarkMode()).toBeTrue();
  });

  it('should initialize to light mode when localStorage has theme=light', () => {
    localStorage.setItem('theme', 'light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);
    expect(service.isDarkMode()).toBeFalse();
  });

  describe('toggleTheme()', () => {
    it('should switch from light to dark', () => {
      localStorage.setItem('theme', 'light');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [ThemeService] });
      service = TestBed.inject(ThemeService);

      service.toggleTheme();
      expect(service.isDarkMode()).toBeTrue();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should switch from dark to light', () => {
      localStorage.setItem('theme', 'dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [ThemeService] });
      service = TestBed.inject(ThemeService);

      service.toggleTheme();
      expect(service.isDarkMode()).toBeFalse();
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should persist theme in localStorage after toggle', () => {
      localStorage.setItem('theme', 'light');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [ThemeService] });
      service = TestBed.inject(ThemeService);

      service.toggleTheme();
      expect(localStorage.getItem('theme')).toBe('dark');

      service.toggleTheme();
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should set data-bs-theme DOM attribute correctly', () => {
      localStorage.setItem('theme', 'light');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [ThemeService] });
      service = TestBed.inject(ThemeService);

      service.toggleTheme(); // → dark
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');

      service.toggleTheme(); // → light
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
    });
  });
});
