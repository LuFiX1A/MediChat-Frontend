import { Injectable } from '@angular/core';
import { SessionUser, UserRole } from './models';
import { initials } from './format';

export interface RegisteredAccountView {
  name: string;
  email: string;
  role: UserRole;
  color: string;
}

const API_BASE = 'http://127.0.0.1:8000/api';
const SESSION_STORAGE_KEY = 'ht_session';
const TOKEN_STORAGE_KEY = 'ht_token';

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

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.current() !== null;
  }

  async login(email: string, password: string): Promise<SessionUser | null> {
    const normalized = email.trim().toLowerCase();
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, password }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const session: SessionUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as UserRole,
        initials: data.user.initials || initials(data.user.name),
        patientId: data.user.patientId || undefined,
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      if (data.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      }
      return session;
    } catch (error) {
      console.error('Error conectando con /api/auth/login:', error);
      return null;
    }
  }

  async register(
    name: string,
    email: string,
    password: string,
    extras: {
      document?: string;
      age?: number;
      sex?: string;
      phone?: string;
      insurance?: string;
    } = {},
  ): Promise<SessionUser | null> {
    const normalized = email.trim().toLowerCase();
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: normalized,
          password,
          role: 'Paciente',
          document: extras.document || null,
          age: extras.age ?? 28,
          sex: extras.sex || 'Femenino',
          phone: extras.phone || '+52 449 000 0000',
          insurance: extras.insurance || 'IMSS Bienestar',
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: 'Paciente',
        initials: data.initials || initials(data.name),
        patientId: data.patientId || undefined,
      };
    } catch (error) {
      console.error('Error conectando con /api/auth/register:', error);
      return null;
    }
  }

  registeredUsers(): RegisteredAccountView[] {
    return [];
  }

  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}