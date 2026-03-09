import { Component, OnDestroy, inject, effect, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ProfileService } from '../../../core/services/profile.service';
import { Notification } from '../../../core/models/notification.model';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

type FeatureAudience = 'ALL' | 'AUTH' | 'SEEKER' | 'EMPLOYER';

interface FeatureNavItem {
  label: string;
  route?: string;
  audience: FeatureAudience;
  note?: string;
}

interface FeatureNavSection {
  title: string;
  items: FeatureNavItem[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnDestroy {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  isMenuOpen = false;
  isNotificationsOpen = false;
  isProfileMenuOpen = false;
  isSidebarOpen = false;

  notifications: Notification[] = [];
  unreadCount = 0;
  private notificationPollSub: Subscription | null = null;
  private knownNotificationIds = new Set<number>();
  private hasLoadedNotifications = false;
  featureSections: FeatureNavSection[] = [
    {
      title: 'Core',
      items: [
        { label: 'Home', route: '/', audience: 'ALL' },
        { label: 'Find Jobs', route: '/jobs', audience: 'SEEKER' },
        { label: 'Messages', route: '/chat', audience: 'AUTH' },
        { label: 'Dark Mode Toggle', audience: 'ALL', note: 'Top bar action' }
      ]
    },
    {
      title: 'Job Seeker',
      items: [
        { label: 'Seeker Dashboard', route: '/seeker/dashboard', audience: 'SEEKER' },
        { label: 'Resume Builder', route: '/seeker/resume-builder', audience: 'SEEKER' },
        { label: 'Saved Jobs', route: '/seeker/saved-jobs', audience: 'SEEKER' },
        { label: 'Profile Management', route: '/seeker/profile', audience: 'SEEKER' }
      ]
    },
    {
      title: 'Employer',
      items: [
        { label: 'Employer Dashboard', route: '/employer/dashboard', audience: 'EMPLOYER' },
        { label: 'Post Job', route: '/employer/post-job', audience: 'EMPLOYER' },
        { label: 'Candidate Tracking', route: '/employer/dashboard', audience: 'EMPLOYER', note: 'Bulk actions + notes + compare' },
        { label: 'Company Profile', route: '/employer/profile', audience: 'EMPLOYER' }
      ]
    },
    {
      title: 'Advanced',
      items: [
        { label: 'Smart Job Filters', route: '/jobs', audience: 'SEEKER' },
        { label: 'Recommendation Engine', route: '/seeker/dashboard', audience: 'SEEKER' },
        { label: 'Notification Center', route: '/seeker/dashboard', audience: 'SEEKER' },
        { label: 'OTP Registration', route: '/auth/register', audience: 'ALL' }
      ]
    }
  ];

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.profileService.getCurrentProfile().subscribe({
          next: (res: any) => {
            const profile = res?.data;
            if (profile) {
              this.authService.syncCurrentUserProfile({
                name: profile.name,
                email: profile.email
              });
            }
          }
        });
        this.loadNotifications(user.id);
        this.startNotificationPolling(user.id);
      } else {
        this.notifications = [];
        this.unreadCount = 0;
        this.stopNotificationPolling();
        this.knownNotificationIds.clear();
        this.hasLoadedNotifications = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.stopNotificationPolling();
  }

  loadNotifications(userId: number) {
    this.notificationService.getUserNotifications(userId).subscribe(res => {
      const incoming = res || [];
      this.checkForNewNotifications(incoming);
      this.notifications = incoming;
      this.unreadCount = this.notifications.filter(n => !n.isRead).length;
      this.hasLoadedNotifications = true;
    });
  }

  toggleNotifications() {
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }
  }

  markAllAsRead() {
    const userId = this.authService.currentUser()?.id;
    if (userId && this.unreadCount > 0) {
      this.notificationService.markAllAsRead(userId).subscribe(() => {
        this.notifications.forEach(n => n.isRead = true);
        this.unreadCount = 0;
      });
    }
  }

  deleteNotification(notification: Notification, event?: Event) {
    event?.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== notification.id);
      if (!notification.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  clearAllNotifications() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.notificationService.clearAllNotifications(userId).subscribe(() => {
      this.notifications = [];
      this.unreadCount = 0;
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    this.isNotificationsOpen = false;
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (!target) return;

    const targetElement = target as HTMLElement;
    const clickedSidebar = !!targetElement.closest('.feature-sidebar');
    const clickedSidebarToggle = !!targetElement.closest('.sidebar-toggle-btn');
    if (this.isSidebarOpen && !clickedSidebar && !clickedSidebarToggle) {
      this.isSidebarOpen = false;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.isProfileMenuOpen = false;
      this.isNotificationsOpen = false;
    }
  }

  changePassword() {
    this.closeProfileMenu();
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.profileService.getUserById(userId).subscribe({
      next: (res: any) => {
        const securityQuestion = res.data?.securityQuestion;

        Swal.fire({
          title: 'Change Password',
          html: `
            <div class="text-start">
              <label class="form-label small fw-medium">Old Password <span class="text-danger">*</span></label>
              <input type="password" id="old-pwd" class="form-control mb-3">
              ${securityQuestion ? `
              <div class="alert alert-info py-2 px-3 mb-2" role="alert" style="font-size: 0.82rem;">
                <strong>Security Question:</strong> ${securityQuestion}
              </div>
              <label class="form-label small fw-medium">Your Security Answer <span class="text-danger">*</span></label>
              <input type="text" id="security-ans" class="form-control mb-3" placeholder="Your registered answer">
              ` : ''}
              <label class="form-label small fw-medium">New Password <span class="text-danger">*</span></label>
              <div class="input-group mb-3">
                <input type="password" id="new-pwd" class="form-control">
                <button class="btn btn-outline-secondary" type="button" id="toggle-new-pwd">Show</button>
              </div>
              <label class="form-label small fw-medium">Confirm New Password <span class="text-danger">*</span></label>
              <div class="input-group">
                <input type="password" id="confirm-pwd" class="form-control">
                <button class="btn btn-outline-secondary" type="button" id="toggle-confirm-pwd">Show</button>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Update Password',
          showLoaderOnConfirm: true,
          didOpen: () => {
            const newPwdInput = document.getElementById('new-pwd') as HTMLInputElement | null;
            const confirmPwdInput = document.getElementById('confirm-pwd') as HTMLInputElement | null;
            const toggleNewPwd = document.getElementById('toggle-new-pwd') as HTMLButtonElement | null;
            const toggleConfirmPwd = document.getElementById('toggle-confirm-pwd') as HTMLButtonElement | null;

            const bindToggle = (input: HTMLInputElement | null, button: HTMLButtonElement | null) => {
              if (!input || !button) return;
              button.addEventListener('click', () => {
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                button.textContent = show ? 'Hide' : 'Show';
              });
            };

            bindToggle(newPwdInput, toggleNewPwd);
            bindToggle(confirmPwdInput, toggleConfirmPwd);
          },
          preConfirm: () => {
            const oldPwd = (document.getElementById('old-pwd') as HTMLInputElement).value;
            const newPwd = (document.getElementById('new-pwd') as HTMLInputElement).value;
            const confirmPwd = (document.getElementById('confirm-pwd') as HTMLInputElement).value;
            const securityAnsInput = document.getElementById('security-ans') as HTMLInputElement | null;

            if (!oldPwd || !newPwd || !confirmPwd) {
              Swal.showValidationMessage('Please fill all required fields');
              return false;
            }
            if (securityQuestion && securityAnsInput && !securityAnsInput.value.trim()) {
              Swal.showValidationMessage('Please provide your security question answer');
              return false;
            }
            if (newPwd !== confirmPwd) {
              Swal.showValidationMessage('New passwords do not match');
              return false;
            }
            // Password strength validation mirroring registration
            if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(newPwd)) {
              Swal.showValidationMessage('Password must contain at least 1 capital letter, 1 number, and 1 special character');
              return false;
            }

            return new Promise((resolve) => {
              this.profileService.changePassword(userId, oldPwd, newPwd).subscribe({
                next: () => resolve(true),
                error: (err) => {
                  Swal.showValidationMessage(`Failed: ${err.error?.message || 'Incorrect current password or security answer'}`);
                  resolve(null);
                }
              });
            });
          },
          allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({ icon: 'success', title: 'Done!', text: 'Password changed successfully.', timer: 1500, showConfirmButton: false });
          }
        });
      },
      error: () => {
        Swal.fire('Error', 'Could not load account details. Please try again.', 'error');
      }
    });
  }

  logout() {
    this.authService.logout();
    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
    this.stopNotificationPolling();
    this.router.navigate(['/auth/login']);
  }

  private startNotificationPolling(userId: number) {
    this.stopNotificationPolling();
    this.notificationPollSub = interval(8000).subscribe(() => this.loadNotifications(userId));
  }

  private stopNotificationPolling() {
    this.notificationPollSub?.unsubscribe();
    this.notificationPollSub = null;
  }

  private checkForNewNotifications(incoming: Notification[]) {
    const incomingIds = new Set(incoming.map(n => n.id));

    if (!this.hasLoadedNotifications) {
      this.knownNotificationIds = incomingIds;
      return;
    }

    const newlyArrived = incoming.filter(n => !this.knownNotificationIds.has(n.id));
    this.knownNotificationIds = incomingIds;

    for (const note of newlyArrived.slice(0, 2)) {
      this.showNotificationToast(note.message);
    }
  }

  private showNotificationToast(message: string) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'New Notification',
      text: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
  }

  getNotificationTypeLabel(type?: string): string {
    const key = (type || '').toUpperCase();
    if (key === 'WELCOME') return 'Welcome';
    if (key === 'NEW_APPLICATION') return 'New Application';
    if (key === 'APPLICATION_SUBMITTED') return 'Applied';
    if (key === 'APPLICATION_UPDATE') return 'Status Update';
    if (key === 'APPLICATION_WITHDRAWN') return 'Withdrawal';
    if (key === 'WITHDRAWAL_CONFIRMED') return 'Confirmation';
    if (key === 'JOB_POSTED') return 'Job Posted';
    if (key === 'JOB_UPDATED') return 'Job Updated';
    if (key === 'JOB_STATUS') return 'Job Status';
    if (key === 'CHAT_MESSAGE') return 'New Message';
    return 'Notification';
  }

  shouldShowFeature(item: FeatureNavItem): boolean {
    if (item.audience === 'ALL') return true;
    if (item.audience === 'AUTH') return this.authService.isAuthenticated();
    if (item.audience === 'SEEKER') return this.authService.isJobSeeker();
    if (item.audience === 'EMPLOYER') return this.authService.isEmployer();
    return false;
  }
}
