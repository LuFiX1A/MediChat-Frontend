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
  // Vinculamos con el ID #containerContent del HTML para el scroll
  @ViewChild('containerContent') content!: IonContent;

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
      // COMENTADO: Si quieres que aparezca la bienvenida, puedes limpiar el historial, 
      // pero si quieres persistencia, quita la línea de abajo.
      // this.mensajes = []; 
      this.scrollAlFinal();
    }
  }

  guardarEnLocal() {
    localStorage.setItem('chat_history', JSON.stringify(this.mensajes));
  }

  scrollAlFinal() {
    // Aumentamos un poco el tiempo para asegurar que el DOM se haya renderizado
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(500);
      }
    }, 200);
  }

  async mostrarToast(msj: string, color: string = 'danger') {
    const toast = await this.toastCtrl.create({
      message: msj, duration: 3000, position: 'bottom', color: color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    toast.present();
  }

  // FUNCIÓN ACTUALIZADA: Maneja el flujo de triaje de texto
  // MediChat-Frontend/tab1.page.ts (SECCIÓN DE ENVÍO ACTUALIZADA)

  // 1. Maneja el envío de solo texto
  async enviarSoloTexto() {
    if (!this.mensajeUsuario.trim()) return;

    const textoParaEnviar = this.mensajeUsuario;
    this.mensajes.push({ rol: 'usuario', texto: textoParaEnviar });
    this.mensajeUsuario = ""; // Limpiamos input
    this.cargando = true;
    this.scrollAlFinal();

    try {
      // Llamada al servicio inteligente
      const res: any = await this.chatbotService.enviarSoloTexto(textoParaEnviar);

      // Procesamos la respuesta modular de Gemini
      this.mensajes.push({
        rol: 'bot',
        texto: res.diagnostico_ia?.mensaje_al_usuario,
        pautas: res.diagnostico_ia?.pautas_inmediatas || [], // Nuevas pautas
        recomendaciones: res.diagnostico_ia?.recomendaciones || [] // Nuevos doctores
      });

      this.guardarEnLocal();
    } catch (e) {
      this.mostrarToast("No se pudo conectar con el servidor de MediChat.");
    } finally {
      this.cargando = false;
      this.scrollAlFinal();
    }
  }


  // 1. Al presionar la cámara, disparamos el clic del input oculto
  @ViewChild('fileInput') fileInput!: any;

  async botonAbrirCamara() {
    this.fileInput.nativeElement.click();
  }

  // 2. Esta función se activa cuando el usuario elige la foto
  // tab1.page.ts

  async onFileSelected(event: any) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const textoEnvio = this.mensajeUsuario || "Análisis de imagen";
    this.cargando = true;

    try {
      // ¡AHORA SÍ! Le pasamos el texto y el archivo. La línea roja debe morir aquí.
      const res: any = await this.chatbotService.enviarConFoto(textoEnvio, archivo);

      this.mensajes.push({
        rol: 'usuario',
        texto: textoEnvio,
        imagen: res.fotoUrlLocal
      });

      this.mensajes.push({
        rol: 'bot',
        texto: res.diagnostico_ia?.mensaje_al_usuario || res.mensaje || "Análisis completado.",
        pautas: res.diagnostico_ia?.pautas_inmediatas || [],
        recomendaciones: res.diagnostico_ia?.recomendaciones || []
      });

    } catch (error) {
      this.mostrarToast("Error al procesar la imagen.");
    } finally {
      this.cargando = false;
      this.scrollAlFinal();
    }

  }

  async confirmarLimpieza() {
    const alert = await this.alertCtrl.create({
      header: '¿Borrar historial?',
      message: 'Se eliminarán todos los mensajes de triaje y análisis.',
      cssClass: 'alerta-premium',
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

  async mostrarInfoLegal() {
    const alert = await this.alertCtrl.create({
      cssClass: 'alerta-premium',
      header: 'Seguridad y Legal',
      subHeader: 'MediChat Versión 1.0.4 Beta',
      message:
        'Tus fotos se procesan de forma anónima y segura.\n\n' +
        'Esta aplicación utiliza IA para orientación preliminar. ' +
        'No es un diagnóstico médico oficial. En caso de emergencia, contacte al 911.',
      buttons: [{
        text: 'ENTENDIDO',
        role: 'cancel'
      }]
    });
    await alert.present();
  }
}