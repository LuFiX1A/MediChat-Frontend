import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { DataService } from '../../core/data.service';
import { formatDateShort, initials, todayISO } from '../../core/format';
import { Patient, RiskLevel, Sex } from '../../core/models';
import { badgeClass } from '../../core/ui';

interface NewPatientForm {
  name: string;
  document: string;
  age: number;
  sex: Sex;
  phone: string;
  email: string;
  bloodType: string;
  insurance: string;
  risk: RiskLevel;
  conditions: string;
  allergies: string;
}

@Component({
  selector: 'app-patients',
  templateUrl: './patients.page.html',
  styleUrls: ['./patients.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonIcon],
})
export class PatientsPage implements OnInit {
  search = '';
  riskFilter = 'Todos';
  statusFilter = 'Todos';
  showNewModal = false;
  modalError = '';

  nuevo: NewPatientForm = this.emptyForm();

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const query = params.get('q');
      if (query) {
        this.search = query;
      }
    });
  }

  get filteredPatients(): Patient[] {
    const term = this.search.trim().toLowerCase();
    return this.data.patients.filter((patient) => {
      const matchesTerm =
        !term ||
        patient.name.toLowerCase().includes(term) ||
        patient.document.toLowerCase().includes(term) ||
        patient.email.toLowerCase().includes(term);
      const matchesRisk = this.riskFilter === 'Todos' || patient.risk === this.riskFilter;
      const matchesStatus = this.statusFilter === 'Todos' || patient.status === this.statusFilter;
      return matchesTerm && matchesRisk && matchesStatus;
    });
  }

  get activeCount(): number {
    return this.data.patients.filter((patient) => patient.status !== 'Inactivo').length;
  }

  get totalPatients(): number {
    return this.data.patients.length;
  }

  get followUpCount(): number {
    return this.data.patients.filter((patient) => patient.status === 'En seguimiento').length;
  }

  get highRiskCount(): number {
    return this.data.patients.filter((patient) => patient.risk === 'Alto').length;
  }

  getInitials(name: string): string {
    return initials(name);
  }

  shortDate(iso: string): string {
    return formatDateShort(iso);
  }

  badge(value: string): string {
    return badgeClass(value);
  }

  clearFilters(): void {
    this.search = '';
    this.riskFilter = 'Todos';
    this.statusFilter = 'Todos';
  }

  openNewModal(): void {
    this.nuevo = this.emptyForm();
    this.modalError = '';
    this.showNewModal = true;
  }

  closeModal(): void {
    this.showNewModal = false;
  }

  savePatient(): void {
    if (!this.nuevo.name.trim() || !this.nuevo.document.trim()) {
      this.modalError = 'El nombre y el documento son obligatorios.';
      return;
    }

    if (!this.nuevo.age || this.nuevo.age < 0) {
      this.modalError = 'Ingresa una edad válida.';
      return;
    }

    const patient: Patient = {
      id: '',
      name: this.nuevo.name.trim(),
      age: Number(this.nuevo.age),
      sex: this.nuevo.sex,
      document: this.nuevo.document.trim(),
      birthDate: '',
      bloodType: this.nuevo.bloodType,
      phone: this.nuevo.phone.trim(),
      email: this.nuevo.email.trim(),
      address: 'Sin dirección registrada',
      insurance: this.nuevo.insurance.trim() || 'Sin afiliación',
      allergies: this.splitList(this.nuevo.allergies),
      conditions: this.splitList(this.nuevo.conditions),
      medications: [],
      lastVisit: todayISO(),
      status: 'Activo',
      risk: this.nuevo.risk,
      color: '#2f9cc9',
      vitals: { pressure: '—', heartRate: 0, temperature: 0, weight: 0, height: 0 },
      consultations: [],
    };

    const created = this.data.addPatient(patient);
    this.data.log(
      'Paciente creado',
      'Pacientes',
      `Se registró el expediente de ${created.name} (${created.document}).`,
    );
    this.showNewModal = false;
    this.router.navigate(['/pacientes', created.id]);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  private splitList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private emptyForm(): NewPatientForm {
    return {
      name: '',
      document: '',
      age: 30,
      sex: 'F',
      phone: '',
      email: '',
      bloodType: 'O+',
      insurance: '',
      risk: 'Bajo',
      conditions: '',
      allergies: '',
    };
  }
}
