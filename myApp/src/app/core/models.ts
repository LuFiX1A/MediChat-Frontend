export type Sex = 'F' | 'M';
export type RiskLevel = 'Bajo' | 'Medio' | 'Alto';
export type PatientStatus = 'Activo' | 'En seguimiento' | 'Inactivo';
export type AppointmentStatus = 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Completada';
export type UserRole = 'Administrador' | 'Médico' | 'Enfermería' | 'Auditor';
export type UserStatus = 'Activo' | 'Inactivo';
export type AuditSeverity = 'info' | 'warning' | 'critical';
export type ConsultationStatus = 'Activa' | 'Seguimiento' | 'Finalizada';

export interface VitalSigns {
  pressure: string;
  heartRate: number;
  temperature: number;
  weight: number;
  height: number;
}

export interface Consultation {
  id: string;
  date: string;
  doctor: string;
  specialty: string;
  reason: string;
  symptoms: string;
  notes: string;
  diagnosis: string;
  treatment: string;
  status: ConsultationStatus;
  risk: RiskLevel;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  document: string;
  birthDate: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  insurance: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  lastVisit: string;
  status: PatientStatus;
  risk: RiskLevel;
  color: string;
  vitals: VitalSigns;
  consultations: Consultation[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  specialty: string;
  doctor: string;
  reason: string;
  status: AppointmentStatus;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastAccess: string;
  color: string;
}

export interface AuditEntry {
  id: string;
  date: string;
  time: string;
  user: string;
  action: string;
  module: string;
  detail: string;
  ip: string;
  severity: AuditSeverity;
}

export type HoneypotEventType =
  | 'Ruta señuelo'
  | 'Credenciales señuelo'
  | 'Honeytoken clínico'
  | 'Exportación señuelo';

export interface HoneypotEvent {
  id: string;
  timestamp: string;
  type: HoneypotEventType;
  severity: AuditSeverity;
  route: string;
  detail: string;
  user: string;
  role: string;
  origin: string;
  userAgent: string;
  attemptedUser?: string;
}

export interface RolePermission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface SessionUser {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

