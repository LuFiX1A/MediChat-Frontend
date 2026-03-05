import { Component, inject, ViewChild } from '@angular/core'; // <--- Agregamos ViewChild
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonContent } from '@ionic/angular'; // <--- Agregamos IonContent
import { ChatbotService, Recomendacion } from '../services/chatbot';
import { Router } from '@angular/router';

interface MensajeChat {
  remitente: 'usuario' | 'bot';
  texto: string;
  doctores?: Recomendacion[];
}

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Tab1Page {
  private chatbotService = inject(ChatbotService);
  private router = inject(Router);

  // CONTROL DEL SCROLL
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  mensajeUsuario: string = '';
  
  // SALUDO FORMAL
  historialChat: MensajeChat[] = [
    { 
      remitente: 'bot', 
      texto: 'Bienvenido. Soy su asistente médico virtual. Por favor, describa sus síntomas para analizar su caso y recomendarle al especialista adecuado.' 
    }
  ];
  cargando: boolean = false;

  // Función para bajar el scroll automáticamente
  scrollToBottom() {
    setTimeout(() => {
      this.content.scrollToBottom(400); // 400ms de animación suave
    }, 100); // Pequeña espera para que Angular pinte el mensaje nuevo
  }

  enviar() {
    if (!this.mensajeUsuario.trim()) return;
    
    const textoEnviado = this.mensajeUsuario;
    this.historialChat.push({ remitente: 'usuario', texto: textoEnviado });
    this.mensajeUsuario = ''; 
    this.cargando = true;
    
    // 1. Scroll al enviar mensaje del usuario
    this.scrollToBottom();

    this.chatbotService.enviarMensaje(textoEnviado).subscribe({
      next: (aux: any) => {
        this.cargando = false;
        const datos = aux.respuesta || aux; 
        
        this.historialChat.push({
          remitente: 'bot',
          texto: datos.mensaje_al_usuario,
          doctores: datos.recomendaciones
        });

        // 2. Scroll al recibir respuesta del bot
        this.scrollToBottom();
      },
      error: (e) => {
        this.cargando = false;
        this.historialChat.push({ remitente: 'bot', texto: 'Error de conexión. Intente nuevamente.' });
        // 3. Scroll también si hay error
        this.scrollToBottom();
      }
    });
  }

  agendarCita(doctor: Recomendacion) {
    this.router.navigate(['/agendar-cita'], { 
      queryParams: { 
        idDoctor: doctor.id_doctor,
        nombreDoctor: doctor.nombre 
      } 
    });
  }
}