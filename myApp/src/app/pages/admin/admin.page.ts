import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { DataService } from '../../core/data.service';
import { formatDateShort, initials } from '../../core/format';
import { DEFAULT_PERMISSIONS } from '../../core/mock-data';
import {
  AuditEntry,
  AuditSeverity,
  HoneypotEvent,
  RolePermission,
  SystemUser,
  UserRole,
  UserStatus,
} from '../../core/models';
import { badgeClass, severityDotClass, severityLabel } from '../../core/ui';

type AdminTab = 'usuarios' | 'roles' | 'auditoria' | 'honeypot' | 'seguridad';
type PermissionKey = 'view' | 'create' | 'edit' | 'delete';

interface NewUserForm {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

interface SecurityLayer {
  title: string;
  subtitle: string;
  icon: string;
  controls: string[];
  tone: string;
}

const MODULES = [
  'Dashboard médico',
  'Pacientes y expedientes',
  'Consulta médica',
  'Gestión de citas',
  'Administración y seguridad',
];

const buildPermissions = (role: UserRole): RolePermission[] =>
  MODULES.map((module) => {
    const base = DEFAULT_PERMISSIONS.find((item) => item.module === module) ?? {
      module,
      view: false,
      create: false,
      edit: false,
      delete: false,
    };

    if (role === 'Administrador') {
      return { module, view: true, create: true, edit: true, delete: true };
    }

    if (role === 'Auditor') {
      return { module, view: true, create: false, edit: false, delete: false };
    }

    if (role === 'Enfermería') {
      const allowed = module !== 'Administración y seguridad';
      return {
        module,
        view: allowed,
        create: module === 'Gestión de citas' || module === 'Consulta médica',
        edit: module === 'Gestión de citas',
        delete: false,
      };
    }

    return { ...base };
  });

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
})
export class AdminPage implements OnInit {
  activeTab: AdminTab = 'usuarios';

  userSearch = '';
  roleFilter = 'Todos';
  showUserModal = false;
  userModalError = '';
  userSavedMessage = '';

  selectedRole: UserRole = 'Médico';
  permissions: Record<UserRole, RolePermission[]> = {
    Administrador: buildPermissions('Administrador'),
    Médico: buildPermissions('Médico'),
    Enfermería: buildPermissions('Enfermería'),
    Auditor: buildPermissions('Auditor'),
  };

  auditSeverity: 'todos' | AuditSeverity = 'todos';
  auditSearch = '';

  readonly tabs: Array<{ id: AdminTab; label: string; icon: string }> = [
    { id: 'usuarios', label: 'Usuarios', icon: 'people-outline' },
    { id: 'roles', label: 'Roles y permisos', icon: 'key-outline' },
    { id: 'auditoria', label: 'Registros de auditoría', icon: 'clipboard-outline' },
    { id: 'honeypot', label: 'Detección de intrusos', icon: 'bug-outline' },
    { id: 'seguridad', label: 'Seguridad en 7 capas', icon: 'shield-checkmark-outline' },
  ];

  readonly decoyRoute = '/sistema/respaldo';
  readonly honeytokenRoute = '/pacientes/pac-canario-001';
  honeypotMessage = '';

  readonly roles: UserRole[] = ['Administrador', 'Médico', 'Enfermería', 'Auditor'];

  readonly securityLayers: SecurityLayer[] = [
    {
      title: '1. Perímetro y red',
      subtitle: 'Borde de la infraestructura en la nube',
      icon: 'cloud-outline',
      tone: 'blue',
      controls: ['WAF y firewall gestionado', 'Segmentación de red y VPC privada', 'Protección DDoS y TLS 1.3'],
    },
    {
      title: '2. Identidad y acceso',
      subtitle: 'Quién puede entrar al sistema',
      icon: 'finger-print-outline',
      tone: 'cyan',
      controls: ['Autenticación multifactor (MFA)', 'Inicio de sesión único (SSO)', 'Política de contraseñas robustas'],
    },
    {
      title: '3. Aplicación',
      subtitle: 'Defensa contra OWASP Top 10',
      icon: 'bug-outline',
      tone: 'amber',
      controls: ['Validación y sanitización de entradas', 'Protección XSS y CSRF', 'Consultas parametrizadas contra inyección'],
    },
    {
      title: '4. Datos',
      subtitle: 'Confidencialidad de la información clínica',
      icon: 'lock-closed-outline',
      tone: 'violet',
      controls: ['Cifrado en reposo AES-256', 'Cifrado en tránsito TLS 1.3', 'Enmascaramiento de datos sensibles'],
    },
    {
      title: '5. Base de datos',
      subtitle: 'Persistencia relacional y documental',
      icon: 'server-outline',
      tone: 'green',
      controls: ['Respaldos automáticos y cifrados', 'Roles y privilegios mínimos', 'Rastreo de cambios y versionado'],
    },
    {
      title: '6. Monitoreo y auditoría',
      subtitle: 'Visibilidad permanente del sistema',
      icon: 'speedometer-outline',
      tone: 'red',
      controls: ['Registro inmutable de eventos', 'Alertas de accesos anómalos', 'Retención y revisión periódica'],
    },
    {
      title: '7. Recuperación',
      subtitle: 'Continuidad y respuesta a incidentes',
      icon: 'refresh-outline',
      tone: 'slate',
      controls: ['Plan de recuperación ante desastres', 'Pruebas de restauración', 'Protocolo de notificación de brechas'],
    },
  ];

  readonly owaspItems = [
    {
      code: 'A07',
      title: 'Autenticación insegura',
      description: 'MFA, bloqueo por intentos fallidos y políticas de contraseña robustas.',
      status: 'Mitigado',
    },
    {
      code: 'A03',
      title: 'Inyección',
      description: 'Consultas parametrizadas y validación estricta de entradas en la API.',
      status: 'Mitigado',
    },
    {
      code: 'A03',
      title: 'Cross-Site Scripting (XSS)',
      description: 'Sanitización de contenido, CSP y escape de datos en las vistas.',
      status: 'Mitigado',
    },
  ];

  nuevo: NewUserForm = this.emptyUserForm();

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (
        tab === 'usuarios' ||
        tab === 'roles' ||
        tab === 'auditoria' ||
        tab === 'honeypot' ||
        tab === 'seguridad'
      ) {
        this.activeTab = tab;
      }
    });
  }

  get users(): SystemUser[] {
    return this.data.users;
  }

  get auditLog(): AuditEntry[] {
    return this.data.auditLog;
  }

  get filteredUsers(): SystemUser[] {
    const term = this.userSearch.trim().toLowerCase();
    return this.data.users.filter((user) => {
      const matchesTerm =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = this.roleFilter === 'Todos' || user.role === this.roleFilter;
      return matchesTerm && matchesRole;
    });
  }

  get activeUsers(): number {
    return this.data.users.filter((user) => user.status === 'Activo').length;
  }

  get adminUsers(): number {
    return this.data.users.filter((user) => user.role === 'Administrador').length;
  }

  get filteredAudit(): AuditEntry[] {
    const term = this.auditSearch.trim().toLowerCase();
    return this.data.auditLog.filter((entry) => {
      const matchesSeverity = this.auditSeverity === 'todos' || entry.severity === this.auditSeverity;
      const matchesTerm =
        !term ||
        entry.user.toLowerCase().includes(term) ||
        entry.action.toLowerCase().includes(term) ||
        entry.module.toLowerCase().includes(term) ||
        entry.detail.toLowerCase().includes(term) ||
        entry.ip.includes(term);
      return matchesSeverity && matchesTerm;
    });
  }

  get criticalCount(): number {
    return this.data.auditLog.filter((entry) => entry.severity === 'critical').length;
  }

  get warningCount(): number {
    return this.data.auditLog.filter((entry) => entry.severity === 'warning').length;
  }

  get honeypotLog(): HoneypotEvent[] {
    return this.data.honeypotLog;
  }

  get honeypotCriticalCount(): number {
    return this.data.honeypotLog.filter((event) => event.severity === 'critical').length;
  }

  get honeypotTypeCount(): number {
    return new Set(this.data.honeypotLog.map((event) => event.type)).size;
  }

  get honeypotLastEvent(): HoneypotEvent | undefined {
    return this.data.honeypotLog[0];
  }

  get currentPermissions(): RolePermission[] {
    return this.permissions[this.selectedRole];
  }

  get enabledPermissions(): number {
    return this.currentPermissions.reduce(
      (total, row) => total + (row.view ? 1 : 0) + (row.create ? 1 : 0) + (row.edit ? 1 : 0) + (row.delete ? 1 : 0),
      0,
    );
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.router.navigate([], { queryParams: { tab }, replaceUrl: true });
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

  dotClass(severity: string): string {
    return severityDotClass(severity);
  }

  severityLabelFor(severity: string): string {
    return severityLabel(severity);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  openUserModal(): void {
    this.nuevo = this.emptyUserForm();
    this.userModalError = '';
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
  }

  saveUser(): void {
    this.userModalError = '';

    if (!this.nuevo.name.trim() || !this.nuevo.email.trim()) {
      this.userModalError = 'El nombre y el correo institucional son obligatorios.';
      return;
    }

    if (!this.nuevo.email.includes('@')) {
      this.userModalError = 'El correo institucional no tiene un formato válido.';
      return;
    }

    const exists = this.data.users.some(
      (user) => user.email.toLowerCase() === this.nuevo.email.trim().toLowerCase(),
    );
    if (exists) {
      this.userModalError = 'Ya existe un usuario registrado con ese correo.';
      return;
    }

    const created = this.data.addUser({
      name: this.nuevo.name.trim(),
      email: this.nuevo.email.trim().toLowerCase(),
      role: this.nuevo.role,
      status: this.nuevo.status,
      lastAccess: 'Sin acceso',
      color: '#2f9cc9',
    });

    this.data.log(
      'Usuario creado',
      'Administración',
      `Se creó la cuenta de ${created.name} con rol ${created.role}.`,
      created.role === 'Administrador' ? 'warning' : 'info',
    );

    this.userSavedMessage = `Usuario ${created.name} creado correctamente.`;
    this.showUserModal = false;
  }

  toggleUserStatus(user: SystemUser): void {
    const updated = this.data.toggleUserStatus(user.id);
    if (!updated) {
      return;
    }
    this.data.log(
      'Estado de usuario actualizado',
      'Administración',
      `La cuenta de ${updated.name} quedó ${updated.status === 'Activo' ? 'activa' : 'inactiva'}.`,
      updated.status === 'Activo' ? 'info' : 'warning',
    );
    this.userSavedMessage = `La cuenta de ${updated.name} quedó ${updated.status.toLowerCase()}.`;
  }

  togglePermission(row: RolePermission, key: PermissionKey): void {
    row[key] = !row[key];
  }

  savePermissions(): void {
    this.data.log(
      'Permisos modificados',
      'Administración',
      `Se actualizó la matriz de permisos del rol ${this.selectedRole} (${this.enabledPermissions} privilegios activos).`,
      'warning',
    );
    this.userSavedMessage = `Permisos del rol ${this.selectedRole} guardados correctamente.`;
  }

  exportCsv(): void {
    const rows = this.filteredAudit;
    const header = ['ID', 'Fecha', 'Hora', 'Usuario', 'Acción', 'Módulo', 'Detalle', 'IP', 'Severidad'];
    const lines = rows.map((entry) =>
      [
        entry.id,
        entry.date,
        entry.time,
        entry.user,
        entry.action,
        entry.module,
        entry.detail.replace(/"/g, '""'),
        entry.ip,
        entry.severity,
      ]
        .map((value) => `"${value}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `auditoria-healthtext-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    this.data.log(
      'Exportación de auditoría',
      'Auditoría',
      `Se exportaron ${rows.length} registros de auditoría a formato CSV.`,
      'warning',
    );
  }

  clearAuditFilters(): void {
    this.auditSeverity = 'todos';
    this.auditSearch = '';
  }

  eventTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  refreshHoneypotLog(): void {
    this.data.refreshHoneypot();
    this.honeypotMessage = `Se recargaron ${this.honeypotLog.length} eventos desde el almacenamiento local.`;
    this.activeTab = 'honeypot';
  }

  clearHoneypotLog(): void {
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm('¿Eliminar todos los eventos del honeypot guardados en este navegador?');
    if (!confirmed) {
      return;
    }
    this.data.clearHoneypotLog();
    this.honeypotMessage = 'El registro local del honeypot se vació correctamente.';
  }

  copyRoute(route: string): void {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard) {
      this.honeypotMessage = `Ruta del señuelo: ${route}`;
      return;
    }
    clipboard
      .writeText(route)
      .then(() => {
        this.honeypotMessage = `Ruta copiada: ${route}`;
      })
      .catch(() => {
        this.honeypotMessage = `Ruta del señuelo: ${route}`;
      });
  }

  private emptyUserForm(): NewUserForm {
    return {
      name: '',
      email: '',
      role: 'Médico',
      status: 'Activo',
    };
  }
}
