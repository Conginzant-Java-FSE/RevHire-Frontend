import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRole = route.data['role'];
    const blockedRoles = route.data['blockedRoles'];

    // Check if the current user has the exact correct role (if restricted to one)
    if (requiredRole && authService.currentUser()?.role !== requiredRole) {
      router.navigate(['/']); // Redirect to home if unauthorized
      return false;
    }

    // Check if the current user has a role that is NOT allowed
    if (blockedRoles && blockedRoles.includes(authService.currentUser()?.role)) {
      router.navigate(['/employer/dashboard']); // Route employers to dashboard naturally
      return false;
    }

    return true;
  }

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
