import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionUser, UserRole } from './models';
import { initials } from './format';

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty?: string | null;
}

interface ExistsResponse {
  exists: boolean;
}

export interface RegisteredAccountView {
  name: string;
  email: string;
  role: UserRole;
  color: string;
}

const SESSION_STORAGE_KEY = 'ht_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

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

  /** Valida credenciales contra users de Supabase a través de POST /login. */
  login(email: string, password: string): Observable<SessionUser | null> {
    return this.http.post<ApiUser>(`${this.apiUrl}/login`, { email, password }).pipe(
      map((user) => this.toSession(user)),
      tap((session) => localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))),
      catchError(() => of(null)),
    );
  }

  /** Consulta al backend si el correo ya está registrado en Supabase. */
  isEmailTaken(email: string): Observable<boolean> {
    return this.http
      .get<ExistsResponse>(`${this.apiUrl}/users/exists`, {
        params: { email: email.trim().toLowerCase() },
      })
      .pipe(
        map((response) => response.exists),
        catchError(() => of(false)),
      );
  }

  /** Crea la cuenta en users de Supabase mediante POST /register. */
  register(
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Observable<SessionUser | null> {
    const normalized = email.trim().toLowerCase();
    return this.http
      .post<ApiUser>(`${this.apiUrl}/register`, {
        name: name.trim(),
        email: normalized,
        password,
        role,
        color: this.colorFor(normalized),
      })
      .pipe(
        map((user) => this.toSession(user)),
        catchError(() => of(null)),
      );
  }

  /** Las cuentas ya viven en Supabase; se conserva por compatibilidad con DataService. */
  registeredUsers(): RegisteredAccountView[] {
    return [];
  }

  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private toSession(user: ApiUser): SessionUser {
    return {
      name: user.name,
      email: user.email,
      role: user.role,
      initials: initials(user.name),
    };
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
