import { Injectable } from '@angular/core';
import {
  Appointment,
  AppointmentStatus,
  AuditEntry,
  AuditSeverity,
  Consultation,
  HoneypotEvent,
  HoneypotEventType,
  Patient,
  SystemUser,
  UserStatus,
} from './models';
import {
  HONEYTOKEN_ID,
  HONEYTOKEN_PATIENT,
  isoDate,
  MOCK_APPOINTMENTS,
  MOCK_AUDIT,
  MOCK_PATIENTS,
  MOCK_USERS,
} from './mock-data';
import { todayISO } from './format';
import { AuthService } from './auth.service';

const HONEYPOT_STORAGE_KEY = 'ht_honeypot_events';

@Injectable({ providedIn: 'root' })
export class DataService {
  patients: Patient[] = JSON.parse(JSON.stringify(MOCK_PATIENTS)) as Patient[];
  appointments: Appointment[] = JSON.parse(JSON.stringify(MOCK_APPOINTMENTS)) as Appointment[];
  users: SystemUser[] = JSON.parse(JSON.stringify(MOCK_USERS)) as SystemUser[];
  auditLog: AuditEntry[] = JSON.parse(JSON.stringify(MOCK_AUDIT)) as AuditEntry[];

  readonly honeytokenId = HONEYTOKEN_ID;
  readonly honeytoken: Patient = JSON.parse(JSON.stringify(HONEYTOKEN_PATIENT)) as Patient;
  honeypotLog: HoneypotEvent[] = this.loadHoneypotLog();

  private sequence = 100;

  constructor(private auth: AuthService) {
    this.mergeRegisteredUsers();
  }

  private mergeRegisteredUsers(): void {
    const registered = this.auth.registeredUsers();
    if (registered.length === 0) {
      return;
    }

    const known = new Set(this.users.map((user) => user.email.toLowerCase()));
    const additions: SystemUser[] = registered
      .filter((account) => !known.has(account.email.toLowerCase()))
      .map((account) => ({
        id: `u-reg-${account.email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: account.name,
        email: account.email,
        role: account.role,
        status: 'Activo',
        lastAccess: 'Registro reciente',
        color: account.color || '#2f9cc9',
      }));

    if (additions.length > 0) {
      this.users = [...additions, ...this.users];
    }
  }

  getPatient(id: string): Patient | undefined {
    if (id === this.honeytokenId) {
      return this.honeytoken;
    }
    return this.patients.find((patient) => patient.id === id);
  }

  isHoneytoken(id: string): boolean {
    return id === this.honeytokenId;
  }

  getPatientByName(name: string): Patient | undefined {
    return this.patients.find((patient) => patient.name === name);
  }

  addPatient(patient: Patient): Patient {
    const created: Patient = {
      ...patient,
      id: patient.id || this.nextId('p'),
      lastVisit: patient.lastVisit || todayISO(),
      consultations: patient.consultations ?? [],
    };
    this.patients = [created, ...this.patients];
    return created;
  }

  addConsultation(patientId: string, data: Omit<Consultation, 'id'>): Consultation | undefined {
    const patient = this.getPatient(patientId);
    if (!patient) {
      return undefined;
    }
    const consultation: Consultation = { ...data, id: this.nextId('c') };
    patient.consultations = [consultation, ...patient.consultations];
    patient.lastVisit = consultation.date;
    patient.status = consultation.status === 'Finalizada' ? patient.status : 'En seguimiento';
    return consultation;
  }

  addAppointment(data: Omit<Appointment, 'id'>): Appointment {
    const appointment: Appointment = { ...data, id: this.nextId('a') };
    this.appointments = [...this.appointments, appointment];
    return appointment;
  }

  updateAppointment(id: string, changes: Partial<Appointment>): Appointment | undefined {
    const appointment = this.appointments.find((item) => item.id === id);
    if (!appointment) {
      return undefined;
    }
    Object.assign(appointment, changes);
    return appointment;
  }

  setAppointmentStatus(id: string, status: AppointmentStatus): Appointment | undefined {
    return this.updateAppointment(id, { status });
  }

  getAppointmentsByDate(date: string): Appointment[] {
    return this.appointments
      .filter((appointment) => appointment.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  getAppointmentsForPatient(patientId: string): Appointment[] {
    return this.appointments
      .filter((appointment) => appointment.patientId === patientId)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }

  getTodayAppointments(): Appointment[] {
    return this.getAppointmentsByDate(todayISO());
  }

  getUpcomingAppointments(limit = 6): Appointment[] {
    const today = todayISO();
    return this.appointments
      .filter((appointment) => appointment.date >= today && appointment.status !== 'Cancelada' && appointment.status !== 'Completada')
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, limit);
  }

  addUser(user: Omit<SystemUser, 'id'>): SystemUser {
    const created: SystemUser = { ...user, id: this.nextId('u') };
    this.users = [created, ...this.users];
    return created;
  }

  toggleUserStatus(id: string): SystemUser | undefined {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      return undefined;
    }
    const nextStatus: UserStatus = user.status === 'Activo' ? 'Inactivo' : 'Activo';
    user.status = nextStatus;
    return user;
  }

  log(
    action: string,
    module: string,
    detail: string,
    severity: AuditSeverity = 'info',
    user = 'Dra. Valentina Ortiz',
  ): void {
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, '0');
    const entry: AuditEntry = {
      id: this.nextId('log'),
      date: isoDate(0),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
      user,
      action,
      module,
      detail,
      ip: '190.158.24.10',
      severity,
    };
    this.auditLog = [entry, ...this.auditLog];
  }

  /**
   * Registra un evento del honeypot didáctico. Los eventos se guardan en
   * localStorage (clave `ht_honeypot_events`) para sobrevivir recargas y
   * compartirse entre pestañas del mismo navegador.
   */
  recordHoneypot(
    type: HoneypotEventType,
    route: string,
    detail: string,
    extra: { severity?: AuditSeverity; attemptedUser?: string } = {},
  ): HoneypotEvent {
    const now = new Date();
    const session = this.auth.current();
    const event: HoneypotEvent = {
      id: `hp-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toISOString(),
      type,
      severity: extra.severity ?? 'critical',
      route,
      detail,
      user: session?.name ?? 'Visitante no autenticado',
      role: session?.role ?? 'Sin sesión',
      origin: this.fakeOrigin(),
      userAgent:
        typeof navigator !== 'undefined' && navigator.userAgent
          ? navigator.userAgent
          : 'Agente desconocido',
      attemptedUser: extra.attemptedUser,
    };

    this.honeypotLog = [event, ...this.honeypotLog];
    this.persistHoneypotLog();
    this.log(
      'Intruso detectado en honeypot',
      'Seguridad',
      `${type}: ${detail}`,
      'critical',
      event.user,
    );
    return event;
  }

  refreshHoneypot(): void {
    this.honeypotLog = this.loadHoneypotLog();
  }

  clearHoneypotLog(): void {
    this.honeypotLog = [];
    try {
      localStorage.removeItem(HONEYPOT_STORAGE_KEY);
    } catch {
      // Sin almacenamiento disponible: se limpia solo el estado en memoria.
    }
  }

  get honeypotCount(): number {
    return this.honeypotLog.length;
  }

  private loadHoneypotLog(): HoneypotEvent[] {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(HONEYPOT_STORAGE_KEY) : null;
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return (parsed as HoneypotEvent[])
        .filter((event) => event && typeof event.timestamp === 'string')
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      return [];
    }
  }

  private persistHoneypotLog(): void {
    try {
      localStorage.setItem(HONEYPOT_STORAGE_KEY, JSON.stringify(this.honeypotLog));
    } catch {
      // Si el almacenamiento está lleno o bloqueado, el evento sigue en memoria.
    }
  }

  /** IP simulada dentro del rango de documentación (TEST-NET-3, RFC 5737). */
  private fakeOrigin(): string {
    const octet = Math.floor(Math.random() * 254) + 1;
    return `203.0.113.${octet}`;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}
