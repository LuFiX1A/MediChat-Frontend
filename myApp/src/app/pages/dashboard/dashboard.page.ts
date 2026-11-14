import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { formatDateLong, formatDateShort, greetingByHour, initials, todayISO } from '../../core/format';
import { Appointment, Consultation, Patient } from '../../core/models';
import { badgeClass, severityDotClass } from '../../core/ui';

interface StatCard {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: string;
  trend: string;
}

interface RecentConsultation {
  id: string;
  patientId: string;
  patientName: string;
  reason: string;
  diagnosis: string;
  doctor: string;
  specialty: string;
  date: string;
  severity: string;
}

interface ClinicalAlert {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  source: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon],
})
export class DashboardPage implements OnInit {
  readonly today = todayISO();
  readonly todayLabel = formatDateLong(this.today);
  greeting = greetingByHour();
  userName = 'Doctor(a)';

  stats: StatCard[] = [];
  todayAppointments: Appointment[] = [];
  nextAppointments: Appointment[] = [];
  followUp: Patient[] = [];
  recentConsultations: RecentConsultation[] = [];
  clinicalAlerts: ClinicalAlert[] = [];
  criticalAlerts = 0;
  highRiskCount = 0;
  followUpCount = 0;
  totalPatients = 0;

  constructor(private data: DataService, private auth: AuthService) {}

  ngOnInit(): void {
    this.userName = this.auth.current()?.name ?? 'Doctor(a)';

    const monthPrefix = this.today.slice(0, 7);
    const activePatients = this.data.patients.filter((patient) => patient.status !== 'Inactivo').length;
    const monthlyConsultations = this.data.patients.reduce(
      (total, patient) =>
        total + patient.consultations.filter((consultation) => consultation.date.startsWith(monthPrefix)).length,
      0,
    );

    this.todayAppointments = this.data.getTodayAppointments();
    this.nextAppointments = this.data.getUpcomingAppointments(5);
    this.followUp = this.data.patients
      .filter((patient) => patient.status === 'En seguimiento' || patient.risk === 'Alto')
      .slice(0, 5);

    this.totalPatients = this.data.patients.length;
    this.highRiskCount = this.data.patients.filter((patient) => patient.risk === 'Alto').length;
    this.followUpCount = this.data.patients.filter(
      (patient) => patient.status === 'En seguimiento',
    ).length;
    this.criticalAlerts = this.highRiskCount;

    this.recentConsultations = this.data.patients
      .reduce<Array<{ patient: Patient; consultation: Consultation }>>((entries, patient) => {
        patient.consultations.forEach((consultation) => entries.push({ patient, consultation }));
        return entries;
      }, [])
      .sort((a, b) => b.consultation.date.localeCompare(a.consultation.date))
      .slice(0, 5)
      .map(({ patient, consultation }) => ({
        id: consultation.id,
        patientId: patient.id,
        patientName: patient.name,
        reason: consultation.reason,
        diagnosis: consultation.diagnosis,
        doctor: consultation.doctor,
        specialty: consultation.specialty,
        date: this.shortDate(consultation.date),
        severity:
          consultation.risk === 'Alto'
            ? 'critical'
            : consultation.risk === 'Medio'
              ? 'warning'
              : 'info',
      }));

    const riskAlerts: ClinicalAlert[] = this.data.patients
      .filter((patient) => patient.risk === 'Alto')
      .map((patient) => ({
        id: `alert-risk-${patient.id}`,
        severity: 'critical',
        title: `Riesgo alto · ${patient.name}`,
        detail: `${patient.conditions[0] ?? 'Requiere valoración prioritaria'} · Última visita ${this.shortDate(patient.lastVisit)}`,
        source: `${patient.status} · ${patient.document}`,
      }));

    const followAlerts: ClinicalAlert[] = this.data.patients
      .filter((patient) => patient.risk !== 'Alto' && patient.status === 'En seguimiento')
      .map((patient) => ({
        id: `alert-follow-${patient.id}`,
        severity: 'warning',
        title: `En seguimiento · ${patient.name}`,
        detail: `${patient.conditions[0] ?? 'Control pendiente'} · Revisar evolución`,
        source: `${patient.risk} · ${patient.document}`,
      }));

    this.clinicalAlerts = [...riskAlerts, ...followAlerts].slice(0, 4);

    this.stats = [
      {
        label: 'Pacientes activos',
        value: String(activePatients),
        detail: `${this.data.patients.length} en el expediente`,
        icon: 'people-outline',
        tone: 'blue',
        trend: '+2 este mes',
      },
      {
        label: 'Citas de hoy',
        value: String(this.todayAppointments.length),
        detail: 'Agenda del equipo médico',
        icon: 'calendar-outline',
        tone: 'cyan',
        trend: `${this.nextAppointments.length} próximas`,
      },
      {
        label: 'Consultas del mes',
        value: String(monthlyConsultations),
        detail: 'Notas clínicas registradas',
        icon: 'medkit-outline',
        tone: 'green',
        trend: '+12% vs. mes anterior',
      },
      {
        label: 'Pacientes de alto riesgo',
        value: String(this.highRiskCount),
        detail: `${this.followUpCount} en seguimiento`,
        icon: 'warning-outline',
        tone: 'red',
        trend: 'Revisión clínica',
      },
    ];
  }

  getInitials(name: string): string {
    return initials(name);
  }

  shortDate(iso: string): string {
    return formatDateShort(iso);
  }

  appointmentDay(date: string): string {
    return date === this.today ? 'Hoy' : this.shortDate(date);
  }

  badge(value: string): string {
    return badgeClass(value);
  }

  dotClass(severity: string): string {
    return severityDotClass(severity);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }
}
