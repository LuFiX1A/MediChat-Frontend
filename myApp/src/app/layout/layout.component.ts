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
  globalSearch = '';
  pageTitle = 'Dashboard médico';
  pageSubtitle = 'Resumen general de la actividad clínica';
  user: SessionUser | null = null;
  honeypotCount = 0;

  readonly doctorNav: NavItem[] = [
    { label: 'Dashboard médico', shortLabel: 'Inicio', route: '/dashboard', icon: 'grid-outline', exact: true },
    { label: 'Pacientes y expedientes', shortLabel: 'Pacientes', route: '/pacientes', icon: 'people-outline', exact: false },
    { label: 'Chatbot médico', shortLabel: 'Chatbot', route: '/tabs/tab1', icon: 'chatbubble-ellipses-outline', exact: false },
    { label: 'Consulta médica', shortLabel: 'Consulta', route: '/consulta', icon: 'medkit-outline', exact: false },
    { label: 'Gestión de citas', shortLabel: 'Citas', route: '/citas', icon: 'calendar-outline', exact: false },
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

  // Guards de rol desactivados temporalmente para facilitar las pruebas del equipo.
  // Cambiar a true (y reactivar los canActivate de app.routes.ts) al final.
  private readonly guardsEnabled = false;

  constructor(
    private router: Router,
    private auth: AuthService,
    private data: DataService,
  ) {}

  get navItems(): NavItem[] {
    return this.isAdmin ? this.adminNav : this.doctorNav;
  }

  get isAdmin(): boolean {
    return this.user?.role === 'Administrador';
  }

  ngOnInit(): void {
    this.user = this.auth.current();
    this.refreshHoneypotCount();
    this.updateHeader(this.router.url);
    this.guardRoleArea(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateHeader(event.urlAfterRedirects);
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

  buscarGlobal(): void {
    const query = this.globalSearch.trim();
    if (!query) {
      return;
    }
    this.router.navigate(['/pacientes'], { queryParams: { q: query } });
    this.globalSearch = '';
  }

  irHoneypot(): void {
    this.refreshHoneypotCount();
    this.router.navigate(['/administracion'], { queryParams: { tab: 'honeypot' } });
  }

  refreshHoneypotCount(): void {
    this.data.refreshHoneypot();
    this.honeypotCount = this.data.honeypotLog.length;
  }

  private guardRoleArea(url: string): void {
    if (!this.guardsEnabled) {
      return;
    }

    const clean = url.split('?')[0];

    if (this.isAdmin && !clean.startsWith('/administracion')) {
      this.router.navigateByUrl('/administracion');
      return;
    }

    if (!this.isAdmin && clean.startsWith('/administracion')) {
      this.router.navigateByUrl('/dashboard');
    }
  }

  private updateHeader(url: string): void {
    const clean = url.split('?')[0];

    if (clean.startsWith('/pacientes/')) {
      this.pageTitle = 'Expediente clínico';
      this.pageSubtitle = 'Información integral, antecedentes e historial del paciente';
      return;
    }

    if (clean.startsWith('/tabs')) {
      this.pageTitle = 'Chatbot médico';
      this.pageSubtitle = 'Orientación preliminar, triaje y análisis de imágenes clínicas';
      return;
    }

    const headers: Record<string, { title: string; subtitle: string }> = {
      '/dashboard': {
        title: 'Dashboard médico',
        subtitle: 'Resumen general de la actividad clínica',
      },
      '/pacientes': {
        title: 'Pacientes y expedientes',
        subtitle: 'Historias clínicas, antecedentes y seguimiento',
      },
      '/consulta': {
        title: 'Consulta médica',
        subtitle: 'Registro de síntomas, diagnóstico y tratamiento',
      },
      '/citas': {
        title: 'Gestión de citas',
        subtitle: 'Calendario y agenda del equipo médico',
      },
      '/administracion': {
        title: 'Administración y seguridad',
        subtitle: 'Usuarios, roles, permisos y registros de auditoría',
      },
    };

    const header = headers[clean] ?? headers['/dashboard'];
    this.pageTitle = header.title;
    this.pageSubtitle = header.subtitle;
  }
}
