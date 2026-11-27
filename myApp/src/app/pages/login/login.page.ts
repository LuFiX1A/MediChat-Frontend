import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { SessionUser } from '../../core/models';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
})
export class LoginPage implements OnInit {
  mode: 'login' | 'register' = 'login';

  email = 'doctor@healthtext.com';
  password = 'demo1234';
  showPassword = false;
  remember = true;
  loading = false;
  error = '';
  success = '';

  registerName = '';
  registerEmail = '';
  registerDocument = '';
  registerAge: number | null = 28;
  registerSex = 'Femenino';
  registerPhone = '+52 449 000 0000';
  registerInsurance = 'IMSS Bienestar';
  registerPassword = '';
  registerConfirm = '';
  registerLoading = false;
  registerError = '';

  constructor(
    private auth: AuthService,
    private data: DataService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      const user = this.auth.current();
      if (user) {
        this.router.navigateByUrl(this.routeForSession(user));
      }
    }
  }

  private routeForSession(user: SessionUser): string {
    if (user.role === 'Administrador') {
      return '/administracion';
    }
    if (user.role === 'Paciente') {
      return '/portal-paciente';
    }
    return '/dashboard';
  }

  showLogin(): void {
    this.mode = 'login';
    this.error = '';
    this.registerError = '';
  }

  showRegister(): void {
    this.mode = 'register';
    this.error = '';
    this.success = '';
    this.registerError = '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(): void {
    this.error = '';
    this.success =
      'Para restablecer credenciales institucionales o de paciente, solicita un reinicio seguro al Administrador de HealthText.';
  }

  useDemo(role: 'doctor' | 'admin' | 'patient'): void {
    this.mode = 'login';
    if (role === 'admin') {
      this.email = 'admin@healthtext.com';
    } else if (role === 'patient') {
      this.email = 'paciente@healthtext.com';
    } else {
      this.email = 'doctor@healthtext.com';
    }
    this.password = 'demo1234';
    this.error = '';
    this.success = '';
  }

  async submit(): Promise<void> {
    this.error = '';
    this.success = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Ingresa tu correo y contraseña.';
      return;
    }

    if (!this.email.includes('@')) {
      this.error = 'El correo electrónico no tiene un formato válido.';
      return;
    }

    this.loading = true;

    try {
      const session = await this.auth.login(this.email, this.password);
      if (session) {
        await this.data.syncAllFromCloud();
        this.loading = false;
        this.router.navigateByUrl(this.routeForSession(session));
        return;
      }
      this.error = 'Credenciales incorrectas o usuario inactivo. Verifica tus datos.';
    } catch {
      this.error = 'No se pudo conectar con el servidor de HealthText.';
    } finally {
      this.loading = false;
    }
  }

  async submitRegister(): Promise<void> {
    this.registerError = '';

    const name = this.registerName.trim();
    const email = this.registerEmail.trim().toLowerCase();

    if (!name) {
      this.registerError = 'Ingresa tu nombre completo.';
      return;
    }

    if (!email || !email.includes('@')) {
      this.registerError = 'Ingresa un correo electrónico válido.';
      return;
    }

    if (this.registerPassword.length < 8) {
      this.registerError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    if (this.registerPassword !== this.registerConfirm) {
      this.registerError = 'Las contraseñas no coinciden.';
      return;
    }

    this.registerLoading = true;

    try {
      const session = await this.auth.register(name, email, this.registerPassword, {
        document: this.registerDocument.trim() || undefined,
        age: this.registerAge ?? 28,
        sex: this.registerSex,
        phone: this.registerPhone.trim() || '+52 449 000 0000',
        insurance: this.registerInsurance.trim() || 'IMSS Bienestar',
      });

      if (!session) {
        this.registerError = 'No se pudo crear la cuenta (es posible que el correo ya esté registrado).';
        return;
      }

      await this.data.syncAllFromCloud();

      this.email = session.email;
      this.password = '';
      this.error = '';
      this.success = `Cuenta de paciente creada para ${session.name} en la nube. Ya puedes iniciar sesión.`;
      this.registerName = '';
      this.registerEmail = '';
      this.registerDocument = '';
      this.registerPassword = '';
      this.registerConfirm = '';
      this.mode = 'login';
    } catch {
      this.registerError = 'Error de conexión al registrar la cuenta.';
    } finally {
      this.registerLoading = false;
    }
  }
}