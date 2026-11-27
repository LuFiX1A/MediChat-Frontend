import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { SessionUser } from '../core/models';

interface NavItem {
  label: string;
  shortLabel: string;
  route: string;
  icon: string;
  exact: boolean;
  badge?: string;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, IonIcon],
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('shell') private shell?: ElementRef<HTMLElement>;

  sidebarOpen = false;
  user: SessionUser | null = null;
  honeypotCount = 0;

  // Menú clínico para Médicos / Enfermería (MediChat fue migrado al Portal de Pacientes)
  readonly doctorNav: NavItem[] = [
    { label: 'Dashboard médico', shortLabel: 'Inicio', route: '/dashboard', icon: 'grid-outline', exact: true },
    { label: 'Pacientes y expedientes', shortLabel: 'Pacientes', route: '/pacientes', icon: 'people-outline', exact: false },
    { label: 'Consulta médica', shortLabel: 'Consulta', route: '/consulta', icon: 'medkit-outline', exact: false },
    { label: 'Gestión de citas', shortLabel: 'Citas', route: '/citas', icon: 'calendar-outline', exact: false },
  ];

  // Menú para el Portal de Pacientes
  readonly patientNav: NavItem[] = [
    {
      label: 'MediChat y Mis Citas',
      shortLabel: 'Portal',
      route: '/portal-paciente',
      icon: 'chatbubble-ellipses-outline',
      exact: false,
    },
  ];

  readonly adminNav: NavItem[] = [
    {
      label: 'Administración y seguridad',
      shortLabel: 'Admin',
      route: '/administracion',
      icon: 'shield-checkmark-outline',
      exact: false,
    },
  ];

  private routerSub?: Subscription;
  private readonly guardsEnabled = true;

  constructor(
    private router: Router,
    private auth: AuthService,
    private data: DataService,
  ) { }

  get navItems(): NavItem[] {
    if (this.isAdmin) {
      return this.adminNav;
    }
    if (this.isPatient) {
      return this.patientNav;
    }
    return this.doctorNav;
  }

  get isAdmin(): boolean {
    return this.user?.role === 'Administrador';
  }

  get isPatient(): boolean {
    return this.user?.role === 'Paciente';
  }

  get spaceLabel(): string {
    if (this.isAdmin) {
      return 'Espacio administrativo';
    }
    if (this.isPatient) {
      return 'Portal del paciente';
    }
    return 'Espacio clínico';
  }

  ngOnInit(): void {
    this.user = this.auth.current();
    if (!this.user) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.refreshHoneypotCount();
    this.guardRoleArea(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.guardRoleArea(event.urlAfterRedirects);
        this.refreshHoneypotCount();
        this.sidebarOpen = false;
        this.shell?.nativeElement.scrollTo({ top: 0 });
      });
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.refreshHoneypotCount();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  refreshHoneypotCount(): void {
    this.data.refreshHoneypot();
    this.honeypotCount = this.data.honeypotLog.length;
  }

  private guardRoleArea(url: string): void {
    if (!this.guardsEnabled || !this.user) {
      return;
    }

    const clean = url.split('?')[0];

    if (this.isAdmin && !clean.startsWith('/administracion')) {
      this.router.navigateByUrl('/administracion');
      return;
    }

    if (this.isPatient && !clean.startsWith('/portal-paciente')) {
      this.router.navigateByUrl('/portal-paciente');
      return;
    }

    if (!this.isAdmin && !this.isPatient) {
      if (clean.startsWith('/administracion') || clean.startsWith('/portal-paciente') || clean.startsWith('/chatbot')) {
        this.router.navigateByUrl('/dashboard');
      }
    }
  }
}