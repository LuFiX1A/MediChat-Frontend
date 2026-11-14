import { Injectable } from '@angular/core';
import { SessionUser, UserRole } from './models';
import { initials } from './format';

interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface RegisteredAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  color: string;
  createdAt: string;
}

export interface RegisteredAccountView {
  name: string;
  email: string;
  role: UserRole;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'doctor@healthtext.com',
    password: 'demo1234',
    name: 'Dra. Valentina Ortiz',
    role: 'Médico',
  },
  {
    email: 'admin@healthtext.com',
    password: 'demo1234',
    name: 'Sebastián Mejía',
    role: 'Administrador',
  },
];

const REGISTERED_STORAGE_KEY = 'ht_accounts';
const SESSION_STORAGE_KEY = 'ht_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  current(): SessionUser | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.current() !== null;
  }

  login(email: string, password: string): SessionUser | null {
    const normalized = email.trim().toLowerCase();
    const demo = DEMO_ACCOUNTS.find(
      (item) => item.email === normalized && item.password === password,
    );
    const registered = demo
      ? undefined
      : this.loadRegisteredAccounts().find(
          (item) => item.email.toLowerCase() === normalized && item.password === password,
        );

    const account = demo ?? registered;
    if (!account) {
      return null;
    }

    const session: SessionUser = {
      name: account.name,
      email: normalized,
      role: account.role,
      initials: initials(account.name),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  isEmailTaken(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    const demoExists = DEMO_ACCOUNTS.some((item) => item.email === normalized);
    const registeredExists = this.loadRegisteredAccounts().some(
      (item) => item.email.toLowerCase() === normalized,
    );
    return demoExists || registeredExists;
  }

  /**
   * Registro didáctico: la cuenta se guarda únicamente en localStorage de este
   * navegador. No apto para producción ni para contraseñas reales.
   */
  register(name: string, email: string, password: string, role: UserRole): SessionUser | null {
    const normalized = email.trim().toLowerCase();
    if (this.isEmailTaken(normalized)) {
      return null;
    }

    const account: RegisteredAccount = {
      name: name.trim(),
      email: normalized,
      password,
      role,
      color: this.colorFor(normalized),
      createdAt: new Date().toISOString(),
    };

    const accounts = [...this.loadRegisteredAccounts(), account];
    try {
      localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      return null;
    }

    return {
      name: account.name,
      email: account.email,
      role: account.role,
      initials: initials(account.name),
    };
  }

  registeredUsers(): RegisteredAccountView[] {
    return this.loadRegisteredAccounts().map((account) => ({
      name: account.name,
      email: account.email,
      role: account.role,
      color: account.color,
    }));
  }

  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private loadRegisteredAccounts(): RegisteredAccount[] {
    try {
      const raw = localStorage.getItem(REGISTERED_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return (parsed as RegisteredAccount[]).filter(
        (account) =>
          account &&
          typeof account.name === 'string' &&
          typeof account.email === 'string' &&
          typeof account.password === 'string' &&
          typeof account.role === 'string',
      );
    } catch {
      return [];
    }
  }

  private colorFor(seed: string): string {
    const palette = ['#2f9cc9', '#5b8def', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash * 31 + seed.charCodeAt(index)) % palette.length;
    }
    return palette[hash];
  }
}
