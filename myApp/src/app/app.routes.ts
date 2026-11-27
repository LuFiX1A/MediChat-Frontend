import { Routes } from '@angular/router';
import { adminGuard, authGuard, clinicalGuard, patientGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    // Ruta señuelo del honeypot: pública y fuera del layout
    path: 'sistema/respaldo',
    loadComponent: () => import('./pages/decoy/decoy.page').then((m) => m.DecoyPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        canActivate: [clinicalGuard],
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'portal-paciente',
        canActivate: [patientGuard],
        loadComponent: () =>
          import('./pages/patient-portal/patient-portal.page').then((m) => m.PatientPortalPage),
      },
      {
        path: 'pacientes',
        canActivate: [clinicalGuard],
        loadComponent: () => import('./pages/patients/patients.page').then((m) => m.PatientsPage),
      },
      {
        path: 'pacientes/:id',
        canActivate: [clinicalGuard],
        loadComponent: () =>
          import('./pages/patient-detail/patient-detail.page').then((m) => m.PatientDetailPage),
      },
      {
        path: 'consulta',
        canActivate: [clinicalGuard],
        loadComponent: () =>
          import('./pages/consultation/consultation.page').then((m) => m.ConsultationPage),
      },
      {
        path: 'consulta/:patientId',
        canActivate: [clinicalGuard],
        loadComponent: () =>
          import('./pages/consultation/consultation.page').then((m) => m.ConsultationPage),
      },
      {
        path: 'citas',
        canActivate: [clinicalGuard],
        loadComponent: () =>
          import('./pages/appointments/appointments.page').then((m) => m.AppointmentsPage),
      },
      {
        path: 'administracion',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];