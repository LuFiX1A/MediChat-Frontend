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
  TriageNote,
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

const API_BASE = 'http://127.0.0.1:8000/api';
const HONEYPOT_STORAGE_KEY = 'ht_honeypot_events';

@Injectable({ providedIn: 'root' })
export class DataService {
  patients: Patient[] = JSON.parse(JSON.stringify(MOCK_PATIENTS)) as Patient[];
  appointments: Appointment[] = JSON.parse(JSON.stringify(MOCK_APPOINTMENTS)) as Appointment[];
  users: SystemUser[] = JSON.parse(JSON.stringify(MOCK_USERS)) as SystemUser[];
  auditLog: AuditEntry[] = JSON.parse(JSON.stringify(MOCK_AUDIT)) as AuditEntry[];

  readonly honeytokenId = HONEYTOKEN_ID;
  readonly honeytoken: Patient = JSON.parse(JSON.stringify(HONEYTOKEN_PATIENT)) as Patient;
  honeypotLog: HoneypotEvent[] = [];

  private sequence = 100;

  constructor(private auth: AuthService) {
    void this.syncAllFromCloud();
  }

  private authHeaders(): Record<string, string> {
    const token = this.auth.getToken();
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  }

  async syncAllFromCloud(): Promise<void> {
    await Promise.all([
      this.fetchPatients(),
      this.fetchAppointments(),
      this.fetchUsers(),
      this.fetchAuditLogs(),
      this.fetchHoneypotEvents(),
    ]);
  }

  async fetchPatients(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/patients`, { headers: this.authHeaders() });
      if (res.ok) {
        const list = (await res.json()) as Patient[];
        if (Array.isArray(list) && list.length > 0) {
          this.patients = list.filter((p) => p.id !== this.honeytokenId && !(p as any).isHoneytoken);
        }
      }
    } catch (e) {
      console.warn('Usando respaldo local de pacientes:', e);
    }
  }

  async fetchAppointments(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/appointments`, { headers: this.authHeaders() });
      if (res.ok) {
        const list = (await res.json()) as Appointment[];
        if (Array.isArray(list)) {
          this.appointments = list;
        }
      }
    } catch (e) {
      console.warn('Usando respaldo local de citas:', e);
    }
  }

  async fetchUsers(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: this.authHeaders() });
      if (res.ok) {
        const list = (await res.json()) as SystemUser[];
        if (Array.isArray(list) && list.length > 0) {
          this.users = list;
        }
      }
    } catch (e) {
      console.warn('Usando respaldo local de usuarios:', e);
    }
  }

  async fetchAuditLogs(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/security/audit`, { headers: this.authHeaders() });
      if (res.ok) {
        const list = (await res.json()) as AuditEntry[];
        if (Array.isArray(list) && list.length > 0) {
          this.auditLog = list;
        }
      }
    } catch (e) {
      console.warn('Usando respaldo local de auditoría:', e);
    }
  }

  async fetchHoneypotEvents(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/security/honeypot`, { headers: this.authHeaders() });
      if (res.ok) {
        const list = (await res.json()) as HoneypotEvent[];
        if (Array.isArray(list)) {
          this.honeypotLog = list;
        }
      }
    } catch (e) {
      console.warn('Usando respaldo local de honeypot:', e);
    }
  }

  get activeDoctors(): SystemUser[] {
    return this.users.filter((u) => u.role === 'Médico' && u.status === 'Activo');
  }

  getPatient(id: string): Patient | undefined {
    if (id === this.honeytokenId) {
      void fetch(`${API_BASE}/patients/${this.honeytokenId}`, { headers: this.authHeaders() }).then(() =>
        this.fetchHoneypotEvents(),
      );
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
    const tempId = patient.id || this.nextId('p');
    const created: Patient = {
      ...patient,
      id: tempId,
      lastVisit: patient.lastVisit || todayISO(),
      consultations: patient.consultations ?? [],
    };
    this.patients = [created, ...this.patients];

    void fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(created),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((saved) => {
        if (saved?.id) {
          created.id = saved.id;
        }
        void this.fetchAuditLogs();
      });

    return created;
  }

  async saveTriageNote(
    patientId: string,
    payload: {
      summary: string;
      recommended_doctor?: string;
      recommended_specialty?: string;
      burn_grade?: number | null;
    },
  ): Promise<TriageNote | null> {
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/triage`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = (await res.json()) as TriageNote;
        const p = this.getPatient(patientId);
        if (p) {
          p.triageNotes = [saved, ...(p.triageNotes ?? [])];
          if (saved.nlpRisk === 'Alto') {
            p.risk = 'Alto';
          }
        }
        return saved;
      }
    } catch (e) {
      console.warn('No se pudo guardar nota de triaje MediChat:', e);
    }
    return null;
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

    void fetch(`${API_BASE}/patients/${patientId}/consultations`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((savedDoc) => {
        if (savedDoc) {
          consultation.id = savedDoc.id;
          consultation.risk = savedDoc.risk;
          patient.risk = savedDoc.risk;
        }
        void this.fetchAuditLogs();
      });

    return consultation;
  }

  addAppointment(data: Omit<Appointment, 'id'>): Appointment {
    const appointment: Appointment = { ...data, id: this.nextId('a') };
    this.appointments = [...this.appointments, appointment];

    void fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((saved) => {
        if (saved?.id) {
          appointment.id = saved.id;
        }
        void this.fetchAuditLogs();
      });

    return appointment;
  }

  async optimizeAppointment(params: {
    patient_id: string;
    patient_name: string;
    risk: string;
    specialty: string;
    duration?: number;
    preferred_date?: string;
    reason?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/appointments/optimize-live`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error('Error ejecutando optimización heurística de citas');
    }
    return res.json();
  }

  async getNlpMetrics(): Promise<any> {
    const res = await fetch(`${API_BASE}/nlp/metrics`, { headers: this.authHeaders() });
    return res.ok ? res.json() : null;
  }

  updateAppointment(id: string, changes: Partial<Appointment>): Appointment | undefined {
    const appointment = this.appointments.find((item) => item.id === id);
    if (!appointment) {
      return undefined;
    }
    Object.assign(appointment, changes);
    if (changes.status) {
      void fetch(`${API_BASE}/appointments/${id}/status`, {
        method: 'PATCH',
        headers: this.authHeaders(),
        body: JSON.stringify({ status: changes.status }),
      });
    }
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

    void fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(user),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((saved) => {
        if (saved?.id) {
          created.id = saved.id;
        }
        void this.fetchAuditLogs();
      });

    return created;
  }

  toggleUserStatus(id: string): SystemUser | undefined {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      return undefined;
    }
    const nextStatus: UserStatus = user.status === 'Activo' ? 'Inactivo' : 'Activo';
    user.status = nextStatus;

    void fetch(`${API_BASE}/users/${id}/toggle-status`, {
      method: 'PATCH',
      headers: this.authHeaders(),
    }).then(() => void this.fetchAuditLogs());

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
    const currentUser = this.auth.current()?.name || user;
    const entry: AuditEntry = {
      id: this.nextId('log'),
      date: isoDate(0),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
      user: currentUser,
      action,
      module,
      detail,
      ip: '190.158.24.10',
      severity,
    };
    this.auditLog = [entry, ...this.auditLog];

    void fetch(`${API_BASE}/security/audit`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ user: currentUser, action, module, detail, severity }),
    });
  }

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

    void fetch(`${API_BASE}/security/honeypot`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(event),
    }).then(() => void this.fetchAuditLogs());

    return event;
  }

  refreshHoneypot(): void {
    void this.fetchHoneypotEvents();
  }

  clearHoneypotLog(): void {
    this.honeypotLog = [];
    try {
      localStorage.removeItem(HONEYPOT_STORAGE_KEY);
    } catch {
      // Sin almacenamiento local
    }
  }

  get honeypotCount(): number {
    return this.honeypotLog.length;
  }

  private fakeOrigin(): string {
    const octet = Math.floor(Math.random() * 254) + 1;
    return `203.0.113.${octet}`;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}