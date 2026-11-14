import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';
import { UserRole } from '../../core/models';

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
  registerPassword = '';
  registerConfirm = '';
  registerRole: UserRole = 'Médico';
  registerLoading = false;
  registerError = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      const user = this.auth.current();
      this.router.navigateByUrl(user?.role === 'Administrador' ? '/administracion' : '/dashboard');
    }
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

  useDemo(role: 'doctor' | 'admin'): void {
    this.mode = 'login';
    this.email = role === 'doctor' ? 'doctor@healthtext.com' : 'admin@healthtext.com';
    this.password = 'demo1234';
    this.error = '';
    this.success = '';
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Ingresa tu correo institucional y contraseña.';
      return;
    }

    if (!this.email.includes('@')) {
      this.error = 'El correo institucional no tiene un formato válido.';
      return;
    }

    this.loading = true;

    setTimeout(() => {
      const session = this.auth.login(this.email, this.password);
      if (session) {
        this.router.navigateByUrl(session.role === 'Administrador' ? '/administracion' : '/dashboard');
        return;
      }
      this.error = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
      this.loading = false;
    }, 550);
  }

  submitRegister(): void {
    this.registerError = '';

    const name = this.registerName.trim();
    const email = this.registerEmail.trim().toLowerCase();

    if (!name) {
      this.registerError = 'Ingresa tu nombre completo.';
      return;
    }

    if (!email || !email.includes('@')) {
      this.registerError = 'Ingresa un correo institucional válido.';
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

    if (this.auth.isEmailTaken(email)) {
      this.registerError = 'Ya existe una cuenta registrada con ese correo.';
      return;
    }

    this.registerLoading = true;

    setTimeout(() => {
      const session = this.auth.register(
        name,
        email,
        this.registerPassword,
        this.registerRole,
      );

      this.registerLoading = false;

      if (!session) {
        this.registerError = 'No se pudo crear la cuenta. Intenta de nuevo.';
        return;
      }

      this.email = session.email;
      this.password = '';
      this.error = '';
      this.success = `Cuenta creada para ${session.name}. Ya puedes iniciar sesión con tu contraseña.`;
      this.registerName = '';
      this.registerEmail = '';
      this.registerPassword = '';
      this.registerConfirm = '';
      this.registerRole = 'Médico';
      this.mode = 'login';
    }, 600);
  }
}
