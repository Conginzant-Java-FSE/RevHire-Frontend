import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRole = route.data['role'];
    const blockedRoles = route.data['blockedRoles'];

    if (requiredRole && authService.currentUser()?.role !== requiredRole) {
      router.navigate(['/']); 
      return false;
    }

    if (blockedRoles && blockedRoles.includes(authService.currentUser()?.role)) {
      router.navigate(['/employer/dashboard']); 
      return false;
    }

    return true;
  }

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
