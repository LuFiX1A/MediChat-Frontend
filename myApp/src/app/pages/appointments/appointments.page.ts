import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import {
  formatDateLong,
  formatDateShort,
  formatMonthYear,
  initials,
  parseISODate,
  toISODate,
  todayISO,
} from '../../core/format';
import { Appointment, AppointmentStatus, Patient, SessionUser } from '../../core/models';
import { badgeClass } from '../../core/ui';

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  count: number;
  hasCritical: boolean;
}

interface AppointmentForm {
  patientId: string;
  date: string;
  time: string;
  duration: number;
  specialty: string;
  doctor: string;
  reason: string;
  status: AppointmentStatus;
}

export interface HeuristicSuggestion {
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  risk: string;
  priority_score: number;
  justification: string;
  heuristic_metrics: {
    g_cost: number;
    h_cost: number;
    total_f_cost: number;
  };
  evaluated_states: number;
}

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
})
export class AppointmentsPage implements OnInit {
  readonly today = todayISO();
  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly statuses: AppointmentStatus[] = ['Confirmada', 'Pendiente', 'Completada', 'Cancelada'];
  readonly durations = [15, 30, 45, 60];
  readonly specialties = [
    'Medicina General',
    'Dermatología',
    'Cardiología',
    'Neumología',
    'Neurología',
    'Gastroenterología',
    'Endocrinología',
    'Cardiología y Endocrinología',
    'Medicina General y Triaje Clínico',
    'Psicología',
    'Urgencias',
  ];

  currentUser: SessionUser | null = null;
  onlyMyAppointments = false;

  viewDate = new Date();
  selectedDate = this.today;
  calendarDays: CalendarDay[] = [];
  filterSpecialty = 'Todas';

  showModal = false;
  editingId = '';
  modalError = '';
  savedMessage = '';

  optimizing = false;
  aiSuggestion: HeuristicSuggestion | null = null;

  form: AppointmentForm = this.emptyForm();

  constructor(
    private data: DataService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.auth.current();
    this.onlyMyAppointments = this.currentUser?.role === 'Médico';

    const base = parseISODate(this.today);
    this.viewDate = new Date(base.getFullYear(), base.getMonth(), 1);
    this.buildCalendar();

    await this.data.fetchAppointments();

    // Enfocar automáticamente una solicitud pendiente del médico en sesión si hoy no hay citas
    const todayAppts = this.scopedAppointments.filter((a) => a.date === this.selectedDate);
    if (todayAppts.length === 0) {
      const pendingAppt = this.scopedAppointments.find((a) => a.status === 'Pendiente');
      if (pendingAppt?.date) {
        this.selectedDate = pendingAppt.date;
        const parsedPending = parseISODate(pendingAppt.date);
        this.viewDate = new Date(parsedPending.getFullYear(), parsedPending.getMonth(), 1);
      }
    }

    this.buildCalendar();

    this.route.queryParamMap.subscribe((params) => {
      const date = params.get('date');
      if (date) {
        this.selectedDate = date;
        const parsed = parseISODate(date);
        this.viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }

      this.buildCalendar();

      const patientId = params.get('patient');
      if (patientId && this.data.getPatient(patientId)) {
        this.openNew(patientId);
      }
    });
  }

  get isDoctorUser(): boolean {
    return this.currentUser?.role === 'Médico';
  }

  get scopedAppointments(): Appointment[] {
    if (!this.onlyMyAppointments || !this.currentUser) {
      return this.data.appointments;
    }
    const myName = this.currentUser.name.trim().toLowerCase();
    const myId = this.currentUser.id;
    return this.data.appointments.filter(
      (a) =>
        (a.doctorId && myId && a.doctorId === myId) ||
        (a.doctor ?? '').trim().toLowerCase() === myName,
    );
  }

  toggleDoctorScope(): void {
    this.onlyMyAppointments = !this.onlyMyAppointments;
    this.buildCalendar();
  }

  get doctors(): string[] {
    const active = this.data.activeDoctors.map((d) => d.name);
    return active.length > 0 ? active : ['Dra. Valentina Ortiz', 'Dr. Camilo Rojas'];
  }

  get monthLabel(): string {
    return formatMonthYear(this.viewDate);
  }

  get patients(): Patient[] {
    return this.data.patients;
  }

  get selectedLabel(): string {
    return formatDateLong(this.selectedDate);
  }

  get selectedAppointments(): Appointment[] {
    return this.scopedAppointments
      .filter((appointment) => appointment.date === this.selectedDate)
      .filter((appointment) => this.filterSpecialty === 'Todas' || appointment.specialty === this.filterSpecialty);
  }

  get upcoming(): Appointment[] {
    return this.scopedAppointments
      .filter((item) => item.status !== 'Cancelada' && item.status !== 'Completada' && item.date >= this.today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 12);
  }

  get todayCount(): number {
    return this.scopedAppointments.filter((item) => item.date === this.today && item.status !== 'Cancelada').length;
  }

  get pendingCount(): number {
    return this.scopedAppointments.filter((item) => item.status === 'Pendiente').length;
  }

  get confirmedCount(): number {
    return this.scopedAppointments.filter((item) => item.status === 'Confirmada').length;
  }

  get cancelledCount(): number {
    return this.scopedAppointments.filter((item) => item.status === 'Cancelada').length;
  }

  changeMonth(delta: number): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + delta, 1);
    this.buildCalendar();
  }

  goToday(): void {
    const base = parseISODate(this.today);
    this.viewDate = new Date(base.getFullYear(), base.getMonth(), 1);
    this.selectedDate = this.today;
    this.buildCalendar();
  }

  selectDay(day: CalendarDay): void {
    if (!day.inMonth) {
      const parsed = parseISODate(day.iso);
      this.viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    this.selectedDate = day.iso;
    this.buildCalendar();
  }

  shortDate(iso: string): string {
    return formatDateShort(iso);
  }

  getInitials(name: string): string {
    return initials(name);
  }

  badge(value: string): string {
    return badgeClass(value);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  openNew(patientId = ''): void {
    this.editingId = '';
    this.form = this.emptyForm();
    this.form.date = this.selectedDate;
    if (patientId) {
      const patient = this.data.getPatient(patientId);
      this.form.patientId = patientId;
      this.form.reason = patient ? `Consulta de ${patient.name.split(' ')[0]}` : '';
    }
    this.modalError = '';
    this.aiSuggestion = null;
    this.showModal = true;
  }

  editAppointment(appointment: Appointment): void {
    this.editingId = appointment.id;
    this.form = {
      patientId: appointment.patientId,
      date: appointment.date,
      time: appointment.time === 'Por confirmar' || appointment.time === 'Lo antes posible' ? '09:00' : appointment.time,
      duration: appointment.duration,
      specialty: appointment.specialty,
      doctor: appointment.doctor,
      reason: appointment.reason,
      status: appointment.status === 'Pendiente' ? 'Confirmada' : appointment.status,
    };
    this.modalError = '';
    this.aiSuggestion = null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = '';
    this.aiSuggestion = null;
  }

  async suggestOptimalSlot(): Promise<void> {
    this.modalError = '';
    this.aiSuggestion = null;

    if (!this.form.patientId) {
      this.modalError = 'Selecciona primero un paciente para calcular su prioridad clínica con IA.';
      return;
    }

    const patient = this.data.getPatient(this.form.patientId);
    if (!patient) {
      this.modalError = 'No se encontró el expediente del paciente.';
      return;
    }

    this.optimizing = true;
    try {
      const response = await this.data.optimizeAppointment({
        patient_id: patient.id,
        patient_name: patient.name,
        risk: patient.risk || 'Medio',
        specialty: this.form.specialty,
        duration: Number(this.form.duration) || 30,
        preferred_date: this.form.date || this.today,
        reason: this.form.reason.trim() || 'Valoración clínica prioritaria',
      });

      const best = response?.recommended_slot;
      if (!best) {
        this.modalError = 'No se encontraron bloques disponibles en los próximos 7 días.';
        return;
      }

      this.form.date = best.date;
      this.form.time = best.time;
      if (this.doctors.includes(best.doctor)) {
        this.form.doctor = best.doctor;
      }

      this.aiSuggestion = {
        doctor: best.doctor,
        specialty: best.specialty,
        date: best.date,
        time: best.time,
        risk: best.risk,
        priority_score: best.priority_score,
        justification: best.justification,
        heuristic_metrics: best.heuristic_metrics,
        evaluated_states: response.evaluated_states ?? 0,
      };
    } catch {
      this.modalError = 'No se pudo conectar con el motor heurístico de citas en FastAPI.';
    } finally {
      this.optimizing = false;
    }
  }

  saveAppointment(): void {
    this.modalError = '';

    if (!this.form.patientId) {
      this.modalError = 'Selecciona el paciente de la cita.';
      return;
    }
    if (!this.form.date) {
      this.modalError = 'Selecciona la fecha de la cita.';
      return;
    }
    if (!this.form.time) {
      this.modalError = 'Indica la hora de la cita.';
      return;
    }
    if (!this.form.reason.trim()) {
      this.modalError = 'Registra el motivo de la cita.';
      return;
    }

    const patient = this.data.getPatient(this.form.patientId);
    if (!patient) {
      this.modalError = 'No se encontró el paciente seleccionado.';
      return;
    }

    const payload = {
      patientId: patient.id,
      patientName: patient.name,
      date: this.form.date,
      time: this.form.time,
      duration: Number(this.form.duration),
      specialty: this.form.specialty,
      doctor: this.form.doctor,
      reason: this.form.reason.trim(),
      status: this.form.status,
      priorityScore:
        this.aiSuggestion?.priority_score ?? (patient.risk === 'Alto' ? 3 : patient.risk === 'Medio' ? 2 : 1),
    };

    if (this.editingId) {
      this.data.updateAppointment(this.editingId, payload);
      this.data.log(
        'Cita modificada',
        'Gestión de citas',
        `Se actualizó la cita de ${patient.name} para el ${formatDateShort(payload.date)} a las ${payload.time}.`,
      );
      this.savedMessage = `Cita de ${patient.name} actualizada y confirmada.`;
    } else {
      this.data.addAppointment(payload);
      this.data.log(
        'Cita creada',
        'Gestión de citas',
        `Nueva cita para ${patient.name} el ${formatDateShort(payload.date)} a las ${payload.time}.`,
      );
      this.savedMessage = `Cita de ${patient.name} agendada correctamente.`;
    }

    this.selectedDate = payload.date;
    const parsed = parseISODate(payload.date);
    this.viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    this.buildCalendar();
    this.showModal = false;
    this.editingId = '';
    this.aiSuggestion = null;
  }

  setStatus(appointment: Appointment, status: AppointmentStatus): void {
    if (appointment.status === status) {
      return;
    }
    this.data.setAppointmentStatus(appointment.id, status);
    const labels: Record<AppointmentStatus, string> = {
      Confirmada: 'confirmada',
      Pendiente: 'marcada como pendiente',
      Completada: 'completada',
      Cancelada: 'cancelada',
    };
    this.data.log(
      status === 'Cancelada' ? 'Cita cancelada' : 'Cita actualizada',
      'Gestión de citas',
      `La cita de ${appointment.patientName} del ${formatDateShort(appointment.date)} quedó ${labels[status]}.`,
      status === 'Cancelada' ? 'warning' : 'info',
    );
    this.savedMessage = `La cita de ${appointment.patientName} quedó ${labels[status]}.`;
  }

  verExpediente(patientId: string): void {
    this.router.navigate(['/pacientes', patientId]);
  }

  private buildCalendar(): void {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);

    const days: CalendarDay[] = [];
    for (let index = 0; index < 42; index += 1) {
      const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const iso = toISODate(current);
      const dayAppointments = this.scopedAppointments.filter(
        (appointment) => appointment.date === iso && appointment.status !== 'Cancelada',
      );

      days.push({
        iso,
        day: current.getDate(),
        inMonth: current.getMonth() === month,
        isToday: iso === this.today,
        count: dayAppointments.length,
        hasCritical: dayAppointments.some((appointment) => appointment.status === 'Pendiente'),
      });
    }

    this.calendarDays = days;
  }

  private emptyForm(): AppointmentForm {
    const defaultDoctor =
      this.currentUser?.role === 'Médico' && this.doctors.includes(this.currentUser.name)
        ? this.currentUser.name
        : this.doctors[0] || 'Dra. Valentina Ortiz';

    const docProfile = this.data.activeDoctors.find((d) => d.name === defaultDoctor);

    return {
      patientId: '',
      date: this.today,
      time: '09:00',
      duration: 30,
      specialty: docProfile?.specialty || 'Medicina General',
      doctor: defaultDoctor,
      reason: '',
      status: 'Confirmada',
    };
  }
}