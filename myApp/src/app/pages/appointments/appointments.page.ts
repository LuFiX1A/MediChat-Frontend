import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
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
import { Appointment, AppointmentStatus, Patient } from '../../core/models';
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
    'Psicología',
    'Urgencias',
  ];
  readonly doctors = [
    'Dra. Valentina Ortiz',
    'Dr. Camilo Rojas',
    'Dra. Natalia Cárdenas',
    'Dr. Felipe Vargas',
  ];

  viewDate = new Date();
  selectedDate = this.today;
  calendarDays: CalendarDay[] = [];
  filterSpecialty = 'Todas';

  showModal = false;
  editingId = '';
  modalError = '';
  savedMessage = '';

  form: AppointmentForm = this.emptyForm();

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const base = parseISODate(this.today);
    this.viewDate = new Date(base.getFullYear(), base.getMonth(), 1);
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
    return this.data
      .getAppointmentsByDate(this.selectedDate)
      .filter((appointment) => this.filterSpecialty === 'Todas' || appointment.specialty === this.filterSpecialty);
  }

  get upcoming(): Appointment[] {
    return this.data.getUpcomingAppointments(12);
  }

  get todayCount(): number {
    return this.data.getAppointmentsByDate(this.today).filter((item) => item.status !== 'Cancelada').length;
  }

  get pendingCount(): number {
    return this.data.appointments.filter((item) => item.status === 'Pendiente').length;
  }

  get confirmedCount(): number {
    return this.data.appointments.filter((item) => item.status === 'Confirmada').length;
  }

  get cancelledCount(): number {
    return this.data.appointments.filter((item) => item.status === 'Cancelada').length;
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
    this.showModal = true;
  }

  editAppointment(appointment: Appointment): void {
    this.editingId = appointment.id;
    this.form = {
      patientId: appointment.patientId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      specialty: appointment.specialty,
      doctor: appointment.doctor,
      reason: appointment.reason,
      status: appointment.status,
    };
    this.modalError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = '';
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
    };

    if (this.editingId) {
      this.data.updateAppointment(this.editingId, payload);
      this.data.log(
        'Cita modificada',
        'Gestión de citas',
        `Se actualizó la cita de ${patient.name} para el ${formatDateShort(payload.date)} a las ${payload.time}.`,
      );
      this.savedMessage = `Cita de ${patient.name} actualizada correctamente.`;
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
      const dayAppointments = this.data
        .getAppointmentsByDate(iso)
        .filter((appointment) => appointment.status !== 'Cancelada');

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
    return {
      patientId: '',
      date: this.today,
      time: '09:00',
      duration: 30,
      specialty: 'Medicina General',
      doctor: 'Dra. Valentina Ortiz',
      reason: '',
      status: 'Confirmada',
    };
  }
}
