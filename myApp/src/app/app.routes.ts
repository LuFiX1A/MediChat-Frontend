import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // Le decimos: "Al abrir la app, carga directo el archivo de Tab1"
    loadComponent: () => import('./tab1/tab1.page').then((m) => m.Tab1Page),
  },
  {
    path: 'tab1',
    redirectTo: '', // Si alguien intenta ir a /tab1, lo mandamos al home
    pathMatch: 'full',
  },
];