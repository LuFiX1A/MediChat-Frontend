import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Appointment,
  AppointmentStatus,
  AuditEntry,
  AuditSeverity,
  Consultation,
  HoneypotEvent,
  HoneypotEventType,
  Patient,
  PatientStatus,
  RiskLevel,
  Sex,
  SystemUser,
  UserRole,
  UserStatus,
  VitalSigns,
} from './models';
import { HONEYTOKEN_ID, HONEYTOKEN_PATIENT, isoDate } from './mock-data';
import { todayISO } from './format';
import { AuthService } from './auth.service';

const HONEYPOT_STORAGE_KEY = 'ht_honeypot_events';

interface PgPatient {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  document: string;
  birth_date: string;
  blood_type: string;
  phone: string;
  email: string;
  address: string;
  insurance: string;
  last_visit: string;
  status: PatientStatus;
  risk: RiskLevel;
  color: string;
}

interface VitalRow {
  pressure: string;
  heart_rate: number;
  temperature: number;
  weight: number;
  height: number;
}

interface MedicalRecordDoc {
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  consultations?: Consultation[];
}

interface PgAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  status: AppointmentStatus;
}

interface ApiUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  last_access: string;
  color: string;
}

interface AuditRow {
  id: string;
  date: string;
  time: string;
  user_name: string;
  action: string;
  module: string;
  detail: string;
  ip: string;
  severity: AuditSeverity;
}

interface HoneypotRow {
  id: string;
  timestamp: string;
  type: HoneypotEventType;
  severity: AuditSeverity;
  route: string;
  detail: string;
  user_name: string;
  role: string;
  origin: string;
  user_agent?: string;
  attempted_user?: string;
}

function mapPatient(row: PgPatient, vital?: VitalRow, record?: MedicalRecordDoc | null): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    sex: row.sex,
    document: row.document,
    birthDate: row.birth_date,
    bloodType: row.blood_type,
    phone: row.phone,
    email: row.email,
    address: row.address,
    insurance: row.insurance,
    lastVisit: row.last_visit,
    status: row.status,
    risk: row.risk,
    color: row.color,
    allergies: record?.allergies ?? [],
    conditions: record?.conditions ?? [],
    medications: record?.medications ?? [],
    vitals: vital
      ? {
          pressure: vital.pressure,
          heartRate: vital.heart_rate,
          temperature: vital.temperature,
          weight: vital.weight,
          height: vital.height,
        }
      : { pressure: '—', heartRate: 0, temperature: 0, weight: 0, height: 0 },
    consultations: record?.consultations ?? [],
  };
}

function mapAppointment(row: PgAppointment): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    date: row.date,
    time: row.time,
    duration: row.duration,
    specialty: row.specialty,
    doctor: row.doctor,
    reason: row.reason,
    status: row.status,
  };
}

function mapUser(row: ApiUserRow): SystemUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastAccess: row.last_access,
    color: row.color,
  };
}

function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    user: row.user_name,
    action: row.action,
    module: row.module,
    detail: row.detail,
    ip: row.ip,
    severity: row.severity,
  };
}

function mapHoneypot(row: HoneypotRow): HoneypotEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    type: row.type,
    severity: row.severity,
    route: row.route,
    detail: row.detail,
    user: row.user_name,
    role: row.role,
    origin: row.origin,
    userAgent: row.user_agent ?? 'Agente desconocido',
    attemptedUser: row.attempted_user,
  };
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  patients: Patient[] = [];
  appointments: Appointment[] = [];
  users: SystemUser[] = [];
  auditLog: AuditEntry[] = [];

  readonly honeytokenId = HONEYTOKEN_ID;
  readonly honeytoken: Patient = JSON.parse(JSON.stringify(HONEYTOKEN_PATIENT)) as Patient;
  honeypotLog: HoneypotEvent[] = this.loadHoneypotLog();

  private sequence = 100;

  constructor(private auth: AuthService) {
    this.loadFromApi();
  }

  private loadFromApi(): void {
    this.http.get<PgPatient[]>(`${this.apiUrl}/patients`).subscribe((rows) => {
      if (rows.length === 0) {
        this.patients = [];
        return;
      }
      forkJoin(
        rows.map((row) =>
          forkJoin({
            vitals: this.http
              .get<VitalRow[]>(`${this.apiUrl}/patients/${row.id}/vitals`)
              .pipe(catchError(() => of([]))),
            record: this.http
              .get<MedicalRecordDoc>(`${this.apiUrl}/medical-records/${row.id}`)
              .pipe(catchError(() => of(null))),
          }).pipe(map(({ vitals, record }) => mapPatient(row, vitals[0], record))),
        ),
      ).subscribe((lista) => (this.patients = lista));
    });

    this.http
      .get<PgAppointment[]>(`${this.apiUrl}/appointments`)
      .subscribe((rows) => (this.appointments = rows.map(mapAppointment)));

    this.http
      .get<ApiUserRow[]>(`${this.apiUrl}/users`)
      .subscribe((rows) => (this.users = rows.map(mapUser)));

    this.http
      .get<AuditRow[]>(`${this.apiUrl}/audit-logs`)
      .subscribe((rows) => (this.auditLog = rows.map(mapAudit)));

    this.refreshHoneypot();
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

    this.http
      .post(`${this.apiUrl}/patients`, {
        id: created.id,
        name: created.name,
        age: created.age,
        sex: created.sex,
        document: created.document,
        birth_date: created.birthDate || todayISO(),
        blood_type: created.bloodType,
        phone: created.phone,
        email: created.email,
        address: created.address,
        insurance: created.insurance,
        last_visit: created.lastVisit,
        status: created.status,
        risk: created.risk,
        color: created.color,
        allergies: created.allergies,
        conditions: created.conditions,
        medications: created.medications,
        vitals: {
          pressure: created.vitals.pressure,
          heart_rate: created.vitals.heartRate,
          temperature: created.vitals.temperature,
          weight: created.vitals.weight,
          height: created.vitals.height,
        },
      })
      .subscribe();

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

    this.http.post(`${this.apiUrl}/consultations/${patientId}`, consultation).subscribe();
    return consultation;
  }

  updateVitals(patientId: string, vitals: VitalSigns): void {
    const patient = this.getPatient(patientId);
    if (patient) {
      patient.vitals = { ...vitals };
    }
    this.http
      .patch(`${this.apiUrl}/patients/${patientId}/vitals`, {
        pressure: vitals.pressure,
        heart_rate: vitals.heartRate,
        temperature: vitals.temperature,
        weight: vitals.weight,
        height: vitals.height,
      })
      .subscribe();
  }

  addAppointment(data: Omit<Appointment, 'id'>): Appointment {
    const appointment: Appointment = { ...data, id: this.nextId('a') };
    this.appointments = [...this.appointments, appointment];

    this.http
      .post(`${this.apiUrl}/appointments`, {
        id: appointment.id,
        patient_id: appointment.patientId,
        patient_name: appointment.patientName,
        doctor_id: null,
        doctor: appointment.doctor,
        specialty: appointment.specialty,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        reason: appointment.reason,
        status: appointment.status,
        priority_score: 1,
      })
      .subscribe();

    return appointment;
  }

  updateAppointment(id: string, changes: Partial<Appointment>): Appointment | undefined {
    const appointment = this.appointments.find((item) => item.id === id);
    if (!appointment) {
      return undefined;
    }
    Object.assign(appointment, changes);

    this.http
      .patch(`${this.apiUrl}/appointments/${id}`, {
        id,
        patient_id: appointment.patientId,
        patient_name: appointment.patientName,
        doctor_id: null,
        doctor: appointment.doctor,
        specialty: appointment.specialty,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        reason: appointment.reason,
        status: appointment.status,
        priority_score: 1,
      })
      .subscribe();

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
      .filter(
        (appointment) =>
          appointment.date >= today &&
          appointment.status !== 'Cancelada' &&
          appointment.status !== 'Completada',
      )
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, limit);
  }

  addUser(user: Omit<SystemUser, 'id'>): SystemUser {
    const created: SystemUser = { ...user, id: this.nextId('u') };
    this.users = [created, ...this.users];

    this.http
      .post(`${this.apiUrl}/users`, {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        status: created.status,
        color: created.color,
        password_hash: 'demo1234',
      })
      .subscribe();

    return created;
  }

  toggleUserStatus(id: string): SystemUser | undefined {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      return undefined;
    }
    user.status = user.status === 'Activo' ? 'Inactivo' : 'Activo';

    this.http.patch(`${this.apiUrl}/users/${id}/status`, { status: user.status }).subscribe();
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

    this.http
      .post(`${this.apiUrl}/audit-logs`, {
        id: entry.id,
        date: entry.date,
        time: entry.time,
        user_name: entry.user,
        action: entry.action,
        module: entry.module,
        detail: entry.detail,
        ip: entry.ip,
        severity: entry.severity,
      })
      .subscribe();
  }

  /**
   * Registra un evento del honeypot didáctico. Se guarda en localStorage para
   * respuesta inmediata y se envía a Supabase para que todo el equipo lo vea.
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

    this.http
      .post(`${this.apiUrl}/honeypot-events`, {
        id: event.id,
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity,
        route: event.route,
        detail: event.detail,
        user_name: event.user,
        role: event.role,
        origin: event.origin,
        user_agent: event.userAgent,
        attempted_user: event.attemptedUser ?? null,
      })
      .subscribe();

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
    this.http.get<HoneypotRow[]>(`${this.apiUrl}/honeypot-events`).subscribe((rows) => {
      const remotos = rows.map(mapHoneypot);
      const ids = new Set(remotos.map((event) => event.id));
      const locales = this.loadHoneypotLog().filter((event) => !ids.has(event.id));
      this.honeypotLog = [...remotos, ...locales].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp),
      );
    });
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
