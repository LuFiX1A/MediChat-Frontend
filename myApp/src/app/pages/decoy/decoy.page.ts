import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { DataService } from '../../core/data.service';

interface DecoyBackup {
  name: string;
  size: string;
  date: string;
}

@Component({
  selector: 'app-decoy',
  templateUrl: './decoy.page.html',
  styleUrls: ['./decoy.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
})
export class DecoyPage implements OnInit {
  user = '';
  password = '';
  message = '';
  triggered = false;

  readonly backups: DecoyBackup[] = [
    { name: 'ht_clinical_full_2026-11-07.tar.gz', size: '18,4 GB', date: '07 nov 2026 · 02:00' },
    { name: 'ht_clinical_incremental_2026-11-08.tar.gz', size: '1,2 GB', date: '08 nov 2026 · 02:00' },
    { name: 'ht_users_and_roles.sql.gz', size: '84 MB', date: '08 nov 2026 · 02:05' },
  ];

  constructor(private data: DataService) {}

  ngOnInit(): void {
    this.data.recordHoneypot(
      'Ruta señuelo',
      '/sistema/respaldo',
      'Acceso a la consola interna de respaldos, una ruta que no está enlazada en la aplicación.',
    );
  }

  attemptLogin(): void {
    const attempted = this.user.trim() || '(vacío)';
    this.data.recordHoneypot(
      'Credenciales señuelo',
      '/sistema/respaldo',
      `Intento de autenticación en la consola de respaldos con el usuario "${attempted}".`,
      { severity: 'critical', attemptedUser: attempted },
    );
    this.triggered = true;
    this.message =
      'Credenciales inválidas. El intento de acceso quedó registrado en la auditoría de seguridad.';
    this.password = '';
  }

  downloadBackup(backup: DecoyBackup): void {
    this.data.recordHoneypot(
      'Exportación señuelo',
      '/sistema/respaldo',
      `Intento de descarga del respaldo "${backup.name}" desde la consola interna.`,
    );
    this.triggered = true;
    this.message =
      'El respaldo no está disponible en este entorno. La solicitud de descarga quedó registrada.';
  }
}
