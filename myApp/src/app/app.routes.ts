import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: '',
        redirectTo: 'tab1',
        pathMatch: 'full',
      },
      {
        path: 'tab1',
        loadComponent: () => import('./tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'tab2',
        loadComponent: () => import('./tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'tab3',
        loadComponent: () => import('./tab3/tab3.page').then((m) => m.Tab3Page),
      },
    ],
  },
  {
    // Ruta señuelo del honeypot: pública y fuera del layout para simular una
    // consola interna olvidada. Cualquier acceso se registra en el honeypot.
    path: 'sistema/respaldo',
    loadComponent: () => import('./pages/decoy/decoy.page').then((m) => m.DecoyPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'pacientes',
        loadComponent: () => import('./pages/patients/patients.page').then((m) => m.PatientsPage),
      },
      {
        path: 'pacientes/:id',
        loadComponent: () =>
          import('./pages/patient-detail/patient-detail.page').then((m) => m.PatientDetailPage),
      },
      {
        path: 'consulta',
        loadComponent: () =>
          import('./pages/consultation/consultation.page').then((m) => m.ConsultationPage),
      },
      {
        path: 'consulta/:patientId',
        loadComponent: () =>
          import('./pages/consultation/consultation.page').then((m) => m.ConsultationPage),
      },
      {
        path: 'citas',
        loadComponent: () =>
          import('./pages/appointments/appointments.page').then((m) => m.AppointmentsPage),
      },
      {
        path: 'administracion',
        loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
