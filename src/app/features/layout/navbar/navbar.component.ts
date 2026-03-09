import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ProfileService } from '../../../core/services/profile.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  isMenuOpen = false;
  isProfileMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.closeProfileMenu();
    }
  }

  changePassword() {
    this.closeProfileMenu();
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    // Load the user's stored security question first
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
            if (newPwd.length < 6) {
              Swal.showValidationMessage('Password must contain 1 capital letter, 1 number, and 1 special character');
              return false;
            }

            return new Promise((resolve) => {
              this.profileService.changePassword(userId, oldPwd, newPwd).subscribe({
                next: () => resolve(true),
                error: (err) => {
                  Swal.showValidationMessage(`Failed: ${err.error?.message || 'Incorrect current password'}`);
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
  }
}
