import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Role } from './core/models/auth.model';

export const routes: Routes = [
    {
        path: 'auth/login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'auth/register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: '',
        loadComponent: () => import('./features/layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
        children: [
            {
                path: '',
                loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
                pathMatch: 'full'
            },
            {
                path: 'contact-us',
                loadComponent: () => import('./features/public/contact/contact.component').then(m => m.ContactComponent)
            },
            {
                path: 'privacy-policy',
                loadComponent: () => import('./features/public/privacy/privacy.component').then(m => m.PrivacyComponent)
            },
            {
                path: 'terms-of-service',
                loadComponent: () => import('./features/public/terms/terms.component').then(m => m.TermsComponent)
            },
            {
                path: 'smart-matching',
                loadComponent: () => import('./features/home/smart-matching/smart-matching.component').then(m => m.SmartMatchingComponent)
            },
            {
                path: 'workflow-hub',
                loadComponent: () => import('./features/home/workflow-hub/workflow-hub.component').then(m => m.WorkflowHubComponent)
            },
            {
                path: 'insights-center',
                loadComponent: () => import('./features/home/insights-center/insights-center.component').then(m => m.InsightsCenterComponent)
            },
            {
                path: 'jobs',
                loadComponent: () => import('./features/jobs/job-list/job-list.component').then(m => m.JobListComponent),
                canActivate: [authGuard],
                data: { blockedRoles: [Role.EMPLOYER] }
            },
            {
                path: 'jobs/:id',
                loadComponent: () => import('./features/jobs/job-detail/job-detail.component').then(m => m.JobDetailComponent),
                canActivate: [authGuard]
            },
            {
                path: 'companies/:id',
                loadComponent: () => import('./features/public/company-profile/company-profile.component').then(m => m.CompanyProfileComponent),
                canActivate: [authGuard]
            },
            {
                path: 'seeker/dashboard',
                loadComponent: () => import('./features/seeker/dashboard/dashboard.component').then(m => m.DashboardComponent),
                canActivate: [authGuard],
                data: { role: Role.JOB_SEEKER }
            },
            {
                path: 'seeker/profile',
                loadComponent: () => import('./features/seeker/profile/profile.component').then(m => m.ProfileComponent),
                canActivate: [authGuard],
                data: { role: Role.JOB_SEEKER }
            },
            {
                path: 'seeker/saved-jobs',
                loadComponent: () => import('./features/seeker/saved-jobs/saved-jobs.component').then(m => m.SavedJobsComponent),
                canActivate: [authGuard],
                data: { role: Role.JOB_SEEKER }
            },
            {
                path: 'seeker/resume-builder',
                loadComponent: () => import('./features/seeker/resume-builder/resume-builder.component').then(m => m.ResumeBuilderComponent),
                canActivate: [authGuard],
                data: { role: Role.JOB_SEEKER }
            },
            {
                path: 'employer/dashboard',
                loadComponent: () => import('./features/employer/dashboard/dashboard.component').then(m => m.DashboardComponent),
                canActivate: [authGuard],
                data: { role: Role.EMPLOYER }
            },
            {
                path: 'employer/profile',
                loadComponent: () => import('./features/employer/employer-profile/employer-profile.component').then(m => m.EmployerProfileComponent),
                canActivate: [authGuard],
                data: { role: Role.EMPLOYER }
            },
            {
                path: 'employer/post-job',
                loadComponent: () => import('./features/employer/post-job/post-job.component').then(m => m.PostJobComponent),
                canActivate: [authGuard],
                data: { role: Role.EMPLOYER }
            },
            {
                path: 'employer/jobs/:id/applicants',
                loadComponent: () => import('./features/employer/job-applicants/job-applicants.component').then(m => m.JobApplicantsComponent),
                canActivate: [authGuard],
                data: { role: Role.EMPLOYER }
            },
            {
                path: 'chat',
                loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
                canActivate: [authGuard]
            }
        ]
    },
    {
        path: '**',
        redirectTo: '/jobs'
    }
];
