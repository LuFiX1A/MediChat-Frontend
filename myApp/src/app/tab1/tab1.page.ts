import { Component, ViewChild, OnInit } from '@angular/core';
import { IonicModule, IonContent, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from '../services/chatbot'; 
import { addIcons } from 'ionicons';
import { 
  camera, send, medkitOutline, chatbubbleEllipsesOutline, 
  cameraOutline, medicalOutline, trashOutline, alertCircle, 
  informationCircleOutline, personCircleOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class Tab1Page implements OnInit {
  @ViewChild(IonContent) content!: IonContent;

  mensajeUsuario: string = "";
  mensajes: any[] = [];
  cargando: boolean = false;

  constructor(
    private chatbotService: ChatbotService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      camera, send, medkitOutline, chatbubbleEllipsesOutline, 
      cameraOutline, medicalOutline, trashOutline, alertCircle,
      informationCircleOutline, personCircleOutline
    });
  }

  ngOnInit() {
    const historial = localStorage.getItem('chat_history');
    if (historial) {
      this.mensajes = JSON.parse(historial);
      this.scrollAlFinal();
    }
  }

  guardarEnLocal() {
    localStorage.setItem('chat_history', JSON.stringify(this.mensajes));
  }

  scrollAlFinal() {
    setTimeout(() => {
      if (this.content) { this.content.scrollToBottom(300); }
    }, 150);
  }

  async mostrarToast(msj: string, color: string = 'danger') {
    const toast = await this.toastCtrl.create({
      message: msj, duration: 3000, position: 'bottom', color: color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    toast.present();
  }

  async enviarSoloTexto() {
    if (!this.mensajeUsuario.trim()) return;
    
    const textoParaEnviar = this.mensajeUsuario;
    this.mensajes.push({ rol: 'usuario', texto: textoParaEnviar });
    this.mensajeUsuario = "";
    this.cargando = true;
    this.scrollAlFinal();

    try {
      // Simulación de respuesta o llamada a servicio de texto si existe
      // res = await this.chatbotService.enviarTexto(textoParaEnviar);
      this.guardarEnLocal();
    } catch (e) {
      this.mostrarToast("No se pudo enviar el mensaje. Revisa tu conexión.");
    } finally {
      this.cargando = false;
      this.scrollAlFinal();
    }
  }

  async botonAbrirCamara() {
    this.cargando = true;
    this.scrollAlFinal();
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const res: any = await this.chatbotService.enviarConFoto(this.mensajeUsuario || "Análisis de imagen");
      
      if (res && res.fotoUrlLocal) {
        this.mensajes.push({ 
          rol: 'usuario', 
          texto: "Imagen enviada para análisis.",
          imagen: res.fotoUrlLocal 
        });

        this.mensajes.push({ 
          rol: 'bot', 
          texto: res.diagnostico_ia?.mensaje || res.resultado || "Análisis completado.",
          grado: res.analisis_visual?.grado || res.grado_deteccion 
        });

        this.guardarEnLocal();
        this.mensajeUsuario = "";
      }
    } catch (error) {
      this.mostrarToast("Error en el servidor médico. Inténtalo de nuevo.");
    } finally {
      this.cargando = false;
      this.scrollAlFinal();
    }
  }

  async borrarHistorial() {
    const alert = await this.alertCtrl.create({
      header: '¿Borrar chat?',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Borrar', 
          handler: () => {
            this.mensajes = [];
            localStorage.removeItem('chat_history');
          }
        }
      ]
    });
    alert.present();
  }
}