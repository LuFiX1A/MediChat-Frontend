import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { formatDateLong, initials, todayISO } from '../../core/format';
import { ConsultationStatus, Patient, RiskLevel } from '../../core/models';
import { badgeClass } from '../../core/ui';

interface ConsultationForm {
  patientId: string;
  date: string;
  reason: string;
  symptoms: string;
  notes: string;
  diagnosis: string;
  treatment: string;
  specialty: string;
  status: ConsultationStatus;
  risk: RiskLevel;
  pressure: string;
  heartRate: number;
  temperature: number;
  weight: number;
}

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.page.html',
  styleUrls: ['./consultation.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonIcon],
})
export class ConsultationPage implements OnInit {
  patients: Patient[] = [];
  selectedPatient?: Patient;
  formError = '';
  saved = false;
  savedPatientId = '';
  savedPatientName = '';

  readonly symptomSuggestions = [
    'Fiebre',
    'Dolor',
    'Tos',
    'Erupción',
    'Mareo',
    'Cefalea',
    'Náuseas',
    'Quemadura',
    'Disnea',
    'Fatiga',
    'Dolor abdominal',
    'Palpitaciones',
  ];

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

  consulta: ConsultationForm = this.emptyForm();

  constructor(
    private data: DataService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.patients = this.data.patients;

    this.route.paramMap.subscribe((params) => {
      const patientId = params.get('patientId');
      if (patientId) {
        this.selectPatient(patientId);
      }
    });
  }

  get dateLabel(): string {
    return formatDateLong(this.consulta.date);
  }

  get patientInitials(): string {
    return this.selectedPatient ? initials(this.selectedPatient.name) : '—';
  }

  selectPatient(patientId: string): void {
    this.consulta.patientId = patientId;
    this.selectedPatient = this.data.getPatient(patientId);
  }

  onPatientChange(): void {
    this.selectedPatient = this.data.getPatient(this.consulta.patientId);
  }

  addSymptom(symptom: string): void {
    if (this.consulta.symptoms.toLowerCase().includes(symptom.toLowerCase())) {
      return;
    }
    this.consulta.symptoms = this.consulta.symptoms.trim()
      ? `${this.consulta.symptoms.trim()}, ${symptom}`
      : symptom;
  }

  saveConsultation(): void {
    this.formError = '';

    if (!this.consulta.patientId) {
      this.formError = 'Selecciona el paciente de la consulta.';
      return;
    }
    if (!this.consulta.reason.trim()) {
      this.formError = 'Registra el motivo de la consulta.';
      return;
    }
    if (!this.consulta.symptoms.trim()) {
      this.formError = 'Captura los síntomas del paciente.';
      return;
    }
    if (!this.consulta.diagnosis.trim()) {
      this.formError = 'Registra un diagnóstico o impresión clínica.';
      return;
    }

    const patient = this.data.getPatient(this.consulta.patientId);
    if (!patient) {
      this.formError = 'No se encontró el paciente seleccionado.';
      return;
    }

    const doctor = this.auth.current()?.name ?? 'Dra. Valentina Ortiz';
    const created = this.data.addConsultation(patient.id, {
      date: this.consulta.date,
      doctor,
      specialty: this.consulta.specialty,
      reason: this.consulta.reason.trim(),
      symptoms: this.consulta.symptoms.trim(),
      notes: this.consulta.notes.trim(),
      diagnosis: this.consulta.diagnosis.trim(),
      treatment: this.consulta.treatment.trim() || 'Sin tratamiento registrado.',
      status: this.consulta.status,
      risk: this.consulta.risk,
    });

    if (this.consulta.pressure.trim()) {
      patient.vitals.pressure = this.consulta.pressure.trim();
    }
    if (this.consulta.heartRate > 0) {
      patient.vitals.heartRate = this.consulta.heartRate;
    }
    if (this.consulta.temperature > 0) {
      patient.vitals.temperature = this.consulta.temperature;
    }
    if (this.consulta.weight > 0) {
      patient.vitals.weight = this.consulta.weight;
    }

    this.data.log(
      'Consulta creada',
      'Consulta médica',
      `Nueva nota clínica registrada para ${patient.name}: ${this.consulta.diagnosis.trim()}.`,
      this.consulta.risk === 'Alto' ? 'warning' : 'info',
      doctor,
    );

    this.saved = true;
    this.savedPatientId = patient.id;
    this.savedPatientName = patient.name;
    this.consulta = this.emptyForm();
    this.selectedPatient = undefined;
    this.router.navigate(['/consulta'], { replaceUrl: true });
  }

  newConsultation(): void {
    this.saved = false;
    this.formError = '';
    this.consulta = this.emptyForm();
    this.selectedPatient = undefined;
  }

  badge(value: string): string {
    return badgeClass(value);
  }

  private emptyForm(): ConsultationForm {
    return {
      patientId: '',
      date: todayISO(),
      reason: '',
      symptoms: '',
      notes: '',
      diagnosis: '',
      treatment: '',
      specialty: 'Medicina General',
      status: 'Seguimiento',
      risk: 'Bajo',
      pressure: '',
      heartRate: 0,
      temperature: 0,
      weight: 0,
    };
  }
}
