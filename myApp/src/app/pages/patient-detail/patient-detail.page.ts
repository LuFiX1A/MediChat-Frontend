import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { DataService } from '../../core/data.service';
import { formatDateLong, formatDateShort, initials, todayISO } from '../../core/format';
import { Appointment, Patient } from '../../core/models';
import { badgeClass } from '../../core/ui';

type DetailTab = 'resumen' | 'antecedentes' | 'expediente' | 'historial' | 'tratamientos';

@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.page.html',
  styleUrls: ['./patient-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon],
})
export class PatientDetailPage implements OnInit {
  patient?: Patient;
  activeTab: DetailTab = 'resumen';
  nextAppointment?: Appointment;
  isHoneytoken = false;

  readonly tabs: Array<{ id: DetailTab; label: string; icon: string }> = [
    { id: 'resumen', label: 'Resumen', icon: 'person-outline' },
    { id: 'antecedentes', label: 'Antecedentes', icon: 'clipboard-outline' },
    { id: 'expediente', label: 'Expediente', icon: 'document-text-outline' },
    { id: 'historial', label: 'Historial de consultas', icon: 'time-outline' },
    { id: 'tratamientos', label: 'Tratamientos', icon: 'medkit-outline' },
  ];

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/pacientes');
      return;
    }

    this.patient = this.data.getPatient(id);
    if (!this.patient) {
      this.router.navigateByUrl('/pacientes');
      return;
    }

    if (this.data.isHoneytoken(id)) {
      this.isHoneytoken = true;
      this.data.recordHoneypot(
        'Honeytoken clínico',
        `/pacientes/${id}`,
        `Apertura del expediente canario ${this.patient.document} (${this.patient.name}).`,
      );
    }

    this.nextAppointment = this.data
      .getAppointmentsForPatient(id)
      .filter(
        (appointment) =>
          appointment.date >= todayISO() &&
          appointment.status !== 'Cancelada' &&
          appointment.status !== 'Completada',
      )[0];
  }

  setTab(tab: DetailTab): void {
    this.activeTab = tab;
  }

  getInitials(name: string): string {
    return initials(name);
  }

  shortDate(iso: string): string {
    return formatDateShort(iso);
  }

  longDate(iso: string): string {
    return formatDateLong(iso);
  }

  badge(value: string): string {
    return badgeClass(value);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  get bmi(): string {
    if (!this.patient || !this.patient.vitals.weight || !this.patient.vitals.height) {
      return '—';
    }
    const value = this.patient.vitals.weight / (this.patient.vitals.height * this.patient.vitals.height);
    return value.toFixed(1);
  }

  get activeTreatments(): number {
    if (!this.patient) {
      return 0;
    }
    return this.patient.consultations.filter((consultation) => consultation.status !== 'Finalizada').length;
  }
}
