import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegistrationRequest,
  ResetPasswordRequest,
  Role
} from '../models/auth.model';
import { ApiResponse } from '../models/api-response.model';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  // Signals for reactive state
  currentUser = signal<AuthResponse | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor(private http: HttpClient, private router: Router) {
    this.restoreSession();
  }

  register(data: RegistrationRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, data).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  sendOtp(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/send-otp`, null, { params: { email: email.trim() } });
  }

  getSecurityQuestion(email: string): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.apiUrl}/security-question`, { params: { email: email.trim() } });
  }

  resetPassword(data: ResetPasswordRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/reset-password`, {
      ...data,
      email: data.email.trim()
    });
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, data).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  loginWithOtp(email: string, otpCode: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login-otp`, {
      email: email.trim(),
      otpCode: otpCode.trim()
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }

  syncCurrentUserProfile(patch: Partial<Pick<AuthResponse, 'name' | 'email'>>) {
    const existing = this.currentUser();
    if (!existing) return;

    const nextName = patch.name ?? existing.name;
    const nextEmail = patch.email ?? existing.email;
    const hasChanges = nextName !== existing.name || nextEmail !== existing.email;
    if (!hasChanges) return;

    const updated: AuthResponse = {
      ...existing,
      name: nextName,
      email: nextEmail
    };

    localStorage.setItem('auth_user', JSON.stringify(updated));
    this.currentUser.set(updated);
  }

  private setSession(authData: AuthResponse) {
    localStorage.setItem('auth_token', authData.token);
    localStorage.setItem('auth_user', JSON.stringify(authData));
    this.currentUser.set(authData);
    this.isAuthenticated.set(true);
  }

  private restoreSession() {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');

    if (token && userStr) {
      try {
        const decodedToken: any = jwtDecode(token);
        const isExpired = decodedToken.exp * 1000 < Date.now();

        if (!isExpired) {
          this.currentUser.set(JSON.parse(userStr));
          this.isAuthenticated.set(true);
        } else {
          this.logout();
        }
      } catch (e) {
        this.logout();
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isJobSeeker(): boolean {
    const role = this.currentUser()?.role;
    return role ? role.toUpperCase() === Role.JOB_SEEKER.toUpperCase() : false;
  }

  isEmployer(): boolean {
    const role = this.currentUser()?.role;
    return role ? role.toUpperCase() === Role.EMPLOYER.toUpperCase() : false;
  }
}
