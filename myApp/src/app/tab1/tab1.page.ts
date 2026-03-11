import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from '../services/chatbot'; 
import { addIcons } from 'ionicons';
import { camera, send } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class Tab1Page {
  mensajeUsuario: string = "";
  mensajes: any[] = [];

  constructor(private chatbotService: ChatbotService) {
    // Registramos ambos iconos para que sean visibles
    addIcons({ camera, send });
  }

  // FUNCIÓN 1: SOLO ENVIAR TEXTO AL CHAT
  enviarSoloTexto() {
    if (!this.mensajeUsuario.trim()) return;

    this.mensajes.push({
      rol: 'usuario',
      texto: this.mensajeUsuario
    });

    console.log("Enviando texto:", this.mensajeUsuario);
    this.mensajeUsuario = "";
  }

  // FUNCIÓN 2: ABRIR CÁMARA Y ENVIAR AL BACKEND
  async ejecutarCamara() {
    console.log("Iniciando proceso de cámara...");
    
    try {
      // 1. Llamamos al servicio (esto abre la cámara/galería)
      const res: any = await this.chatbotService.enviarConFoto(this.mensajeUsuario || "Consulta con imagen");
      
      // 2. Agregamos el aviso de que se envió la foto
      this.mensajes.push({
        rol: 'usuario',
        texto: "📷 Foto enviada para análisis."
      });

      // 3. Agregamos la respuesta del Bot (IA)
      this.mensajes.push({
        rol: 'bot',
        texto: res.diagnostico_ia?.mensaje || "Análisis completado con éxito.",
        grado: res.analisis_visual?.grado
      });

      this.mensajeUsuario = ""; 
    } catch (error) {
      console.error("Error al usar la cámara o conectar con el servidor:", error);
      alert("No se pudo completar el análisis. Revisa que el servidor de Python esté corriendo.");
    }
  }
}