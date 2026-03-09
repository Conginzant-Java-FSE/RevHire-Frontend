import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StatisticsService } from '../../../core/services/statistics.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ApplicationStatus } from '../../../core/models/application.model';

describe('Seeker DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let appServiceSpy: jasmine.SpyObj<ApplicationService>;
  let jobServiceSpy: jasmine.SpyObj<JobService>;
  let profileServiceSpy: jasmine.SpyObj<ProfileService>;
  let notifServiceSpy: jasmine.SpyObj<NotificationService>;
  let statsServiceSpy: jasmine.SpyObj<StatisticsService>;

  const mockApplications: any[] = [
    { id: 1, jobId: 10, seekerId: 5, status: 'APPLIED', jobTitle: 'Dev', appliedAt: new Date().toISOString() },
    { id: 2, jobId: 11, seekerId: 5, status: 'SHORTLISTED', jobTitle: 'Design', appliedAt: new Date().toISOString() },
    { id: 3, jobId: 12, seekerId: 5, status: 'REJECTED', jobTitle: 'QA', appliedAt: new Date().toISOString() }
  ];

  const mockAuthService = {
    currentUser: () => ({ id: 5, role: 'JOB_SEEKER', name: 'J', email: 'j@t.com', token: 't' }),
    isAuthenticated: () => true,
    isJobSeeker: () => true,
    isEmployer: () => false
  };
  const mockThemeService = { isDarkMode: () => false };

  beforeEach(async () => {
    appServiceSpy = jasmine.createSpyObj('ApplicationService', [
      'getApplicationsBySeeker', 'withdrawApplication', 'getWithdrawalReasons',
      'getActiveApplications', 'getTotalCount', 'getTodayCount', 'getStatusHistory'
    ]);
    jobServiceSpy = jasmine.createSpyObj('JobService', [
      'getAllJobs', 'getRecentJobs', 'getTrendingJobs'
    ]);
    profileServiceSpy = jasmine.createSpyObj('ProfileService', ['getCurrentProfile', 'getResume']);
    notifServiceSpy = jasmine.createSpyObj('NotificationService', [
      'getUserNotifications', 'getUnreadCount', 'markAsRead', 'markAllAsRead',
      'markAsUnread', 'deleteNotification', 'clearAllNotifications'
    ]);
    statsServiceSpy = jasmine.createSpyObj('StatisticsService', ['getSeekerEngagement']);

    appServiceSpy.getApplicationsBySeeker.and.returnValue(of({ success: true, data: mockApplications } as any));
    appServiceSpy.getActiveApplications.and.returnValue(of({ success: true, data: [mockApplications[0]] } as any));
    appServiceSpy.getTotalCount.and.returnValue(of({ success: true, data: 10 } as any));
    appServiceSpy.getTodayCount.and.returnValue(of({ success: true, data: 2 } as any));
    jobServiceSpy.getAllJobs.and.returnValue(of({ success: true, data: [] } as any));
    jobServiceSpy.getRecentJobs.and.returnValue(of({ success: true, data: [] } as any));
    jobServiceSpy.getTrendingJobs.and.returnValue(of({ success: true, data: [] } as any));
    profileServiceSpy.getCurrentProfile.and.returnValue(of({ success: true, data: null } as any));
    profileServiceSpy.getResume.and.returnValue(of({ success: true, data: { skillsList: [] } } as any));
    notifServiceSpy.getUserNotifications.and.returnValue(of([]));
    notifServiceSpy.getUnreadCount.and.returnValue(of(0));
    notifServiceSpy.markAsRead.and.returnValue(of(undefined));
    notifServiceSpy.markAllAsRead.and.returnValue(of(undefined));
    notifServiceSpy.markAsUnread.and.returnValue(of(undefined));
    notifServiceSpy.deleteNotification.and.returnValue(of(undefined));
    notifServiceSpy.clearAllNotifications.and.returnValue(of(undefined));
    statsServiceSpy.getSeekerEngagement.and.returnValue(of({ success: true, data: {} } as any));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: ApplicationService, useValue: appServiceSpy },
        { provide: JobService, useValue: jobServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: NotificationService, useValue: notifServiceSpy },
        { provide: StatisticsService, useValue: statsServiceSpy },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load applications on init and set isLoading = false', () => {
    expect(appServiceSpy.getApplicationsBySeeker).toHaveBeenCalledWith(5);
    expect(component.applications.length).toBe(3);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle application loading error gracefully', () => {
    appServiceSpy.getApplicationsBySeeker.and.returnValue(throwError(() => new Error('error')));
    component.loadApplications();
    expect(component.isLoading).toBeFalse();
  });

  describe('Computed counts', () => {
    it('should return 1 for appliedCount', () => {
      expect(component.appliedCount).toBe(1);
    });

    it('should return 1 for shortlistedCount', () => {
      expect(component.shortlistedCount).toBe(1);
    });

    it('should return 1 for rejectedCount', () => {
      expect(component.rejectedCount).toBe(1);
    });

    it('should return 0 for viewedCount (no UNDER_REVIEW)', () => {
      expect(component.viewedCount).toBe(0);
    });
  });

  describe('Notification management', () => {
    it('should mark notification as read and decrement unreadCount', fakeAsync(() => {
      const notif: any = { id: 1, isRead: false, type: 'APPLICATION', createdAt: new Date().toISOString() };
      component.notifications = [notif];
      component.unreadCount = 1;

      component.markNotificationRead(notif);
      tick();

      expect(notif.isRead).toBeTrue();
      expect(component.unreadCount).toBe(0);
    }));

    it('should not change state for already-read notification', () => {
      const notif: any = { id: 1, isRead: true, type: 'APPLICATION', createdAt: new Date().toISOString() };
      component.markNotificationRead(notif);
      expect(notifServiceSpy.markAsRead).not.toHaveBeenCalled();
    });

    it('should mark all notifications as read', fakeAsync(() => {
      component.unreadCount = 3;
      component.notifications = [
        { id: 1, isRead: false } as any,
        { id: 2, isRead: false } as any
      ];

      component.markAllNotificationsRead();
      tick();

      expect(notifServiceSpy.markAllAsRead).toHaveBeenCalledWith(5);
      expect(component.unreadCount).toBe(0);
      expect(component.notifications.every(n => n.isRead)).toBeTrue();
    }));

    it('should delete notification and remove from list', fakeAsync(() => {
      const notif: any = { id: 1, isRead: true, type: 'INFO', createdAt: new Date().toISOString() };
      component.notifications = [notif];

      component.deleteNotification(notif);
      tick();

      expect(component.notifications.length).toBe(0);
    }));

    it('should clear all notifications', fakeAsync(() => {
      component.notifications = [
        { id: 1, isRead: true } as any,
        { id: 2, isRead: false } as any
      ];
      component.unreadCount = 1;

      component.clearAllNotifications();
      tick();

      expect(component.notifications.length).toBe(0);
      expect(component.unreadCount).toBe(0);
    }));
  });

  describe('groupedNotifications getter', () => {
    it('should return empty array when no notifications', () => {
      component.notifications = [];
      expect(component.groupedNotifications.length).toBe(0);
    });

    it('should group notifications by type', () => {
      component.notifications = [
        { id: 1, isRead: false, type: 'APPLICATION', createdAt: new Date().toISOString() } as any,
        { id: 2, isRead: true, type: 'APPLICATION', createdAt: new Date().toISOString() } as any,
        { id: 3, isRead: false, type: 'GENERAL', createdAt: new Date().toISOString() } as any
      ];

      const groups = component.groupedNotifications;
      expect(groups.length).toBe(2);
      const appGroup = groups.find(g => g.label === 'Application');
      expect(appGroup?.items.length).toBe(2);
    });
  });

  describe('saveAlertPreferences()', () => {
    it('should save alert preferences to localStorage', () => {
      component.emailAlerts = false;
      component.pushAlerts = true;
      component.saveAlertPreferences();

      const stored = localStorage.getItem('alerts_pref_5');
      const parsed = stored ? JSON.parse(stored) : null;
      expect(parsed?.emailAlerts).toBeFalse();
      expect(parsed?.pushAlerts).toBeTrue();
    });
  });

  describe('ngOnDestroy()', () => {
    it('should clear polling intervals on destroy', () => {
      spyOn(window, 'clearInterval');
      component.ngOnDestroy();
      expect(clearInterval).toHaveBeenCalled();
    });
  });
});
