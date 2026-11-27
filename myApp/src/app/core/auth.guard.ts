import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const data = inject(DataService);

  if (auth.isAuthenticated()) {
    return true;
  }

  const browserPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const target = state.url && state.url !== '/dashboard' ? state.url : browserPath || state.url || '/';

  if (target !== '/' && target !== '/dashboard' && !target.startsWith('/login')) {
    data.recordHoneypot(
      'Ruta señuelo',
      target,
      `Intento de acceso directo sin autenticación a ruta protegida (${target}).`,
      { severity: 'critical' },
    );
  }

  return router.createUrlTree(['/login']);
};

export const clinicalGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const data = inject(DataService);
  const user = auth.current();

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  if (user.role === 'Paciente') {
    const target = state.url || '/dashboard';
    if (target !== '/dashboard') {
      data.recordHoneypot(
        'Ruta señuelo',
        target,
        `Escalación de privilegios bloqueada: cuenta con rol Paciente intentó acceder a ${target}.`,
        { severity: 'critical' },
      );
    }
    return router.createUrlTree(['/portal-paciente']);
  }

  return true;
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const data = inject(DataService);
  const user = auth.current();

  if (user?.role === 'Administrador') {
    return true;
  }

  const target = state.url || '/administracion';
  data.recordHoneypot(
    'Ruta señuelo',
    target,
    user
      ? `Acceso no autorizado bloqueado en panel administrativo (${target}) por usuario ${user.name} con rol ${user.role}.`
      : `Intento de acceso anónimo bloqueado en panel administrativo (${target}).`,
    { severity: 'critical' },
  );

  if (user?.role === 'Paciente') {
    return router.createUrlTree(['/portal-paciente']);
  }

  return router.createUrlTree([user ? '/dashboard' : '/login']);
};

export const patientGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const data = inject(DataService);
  const user = auth.current();

  if (user?.role === 'Paciente') {
    return true;
  }

  const target = state.url || '/portal-paciente';
  data.recordHoneypot(
    'Ruta señuelo',
    target,
    user
      ? `Acceso cruzado bloqueado en portal de pacientes (${target}) por rol ${user.role}.`
      : `Intento de acceso sin sesión al portal de pacientes (${target}).`,
    { severity: 'warning' },
  );

  if (user?.role === 'Administrador') {
    return router.createUrlTree(['/administracion']);
  }

  return router.createUrlTree([user ? '/dashboard' : '/login']);
};