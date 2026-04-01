import { Component, ViewChild, OnInit } from '@angular/core';
import { IonicModule, IonContent, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from '../services/chatbot';
import { addIcons } from 'ionicons';
import {
  camera, send, medkitOutline, chatbubbleEllipsesOutline,
  cameraOutline, medicalOutline, trashOutline, alertCircle,
  informationCircleOutline, personCircleOutline, closeCircle
} from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class Tab1Page implements OnInit {
  // CORRECCIÓN: Declaración correcta para que funcione el scroll
  @ViewChild('containerContent', { static: false }) content!: IonContent;
  @ViewChild('fileInput') fileInput!: any;

  mensajeUsuario: string = "";
  mensajes: any[] = [];
  cargando: boolean = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(private chatbotService: ChatbotService, private toastCtrl: ToastController, private alertCtrl: AlertController) {
    addIcons({ camera, send, medkitOutline, chatbubbleEllipsesOutline, cameraOutline, medicalOutline, trashOutline, alertCircle, informationCircleOutline, personCircleOutline, closeCircle });
  }

  ngOnInit() {
    const historial = localStorage.getItem('chat_history');
    if (historial) {
      this.mensajes = JSON.parse(historial);
      this.scrollAlFinal();
    }
  }

  async onFileSelected(event: any) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    this.selectedFile = archivo;
    const reader = new FileReader();
    reader.onload = () => { this.previewUrl = reader.result as string; this.scrollAlFinal(); };
    reader.readAsDataURL(archivo);
  }

  cancelarImagen() {
    this.selectedFile = null;
    this.previewUrl = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  async enviarTodo() {
    if (!this.mensajeUsuario.trim() && !this.selectedFile) return;

    const imgParaChat = this.previewUrl;
    const txtParaChat = this.mensajeUsuario.trim() || "Análisis de imagen";

    this.mensajes.push({ rol: 'usuario', texto: txtParaChat, imagen: imgParaChat });

    const fileAEnviar = this.selectedFile;
    this.mensajeUsuario = "";
    this.cancelarImagen();
    this.cargando = true;
    this.scrollAlFinal();

    try {
      let res: any;
      if (fileAEnviar) { res = await this.chatbotService.enviarConFoto(txtParaChat, fileAEnviar); }
      else { res = await this.chatbotService.enviarSoloTexto(txtParaChat); }

      this.mensajes.push({
        rol: 'bot',
        texto: res.diagnostico_ia?.mensaje_al_usuario || res.mensaje,
        pautas: res.diagnostico_ia?.pautas_inmediatas || [],
        recomendaciones: res.diagnostico_ia?.recomendaciones || [],
        grado: res.grado_quemadura
      });
      this.guardarEnLocal();
    } catch (e) {
      this.mostrarToast("Error de conexión.");
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
        { text: 'Borrar', handler: () => { this.mensajes = []; localStorage.removeItem('chat_history'); } }
      ]
    });
    alert.present();
  }

  async mostrarInfoLegal() {
    const alert = await this.alertCtrl.create({
      cssClass: 'alerta-premium',
      header: 'Seguridad y Legal',
      subHeader: 'MediChat Versión 1.0.4 Beta',
      message: 'Tus fotos se procesan de forma anónima y segura.\n\nEsta aplicación utiliza IA para orientación preliminar. No es un diagnóstico médico oficial.',
      buttons: [{ text: 'ENTENDIDO', role: 'cancel' }]
    });
    await alert.present();
  }

  async botonAbrirCamara() { this.fileInput.nativeElement.click(); }
  guardarEnLocal() { localStorage.setItem('chat_history', JSON.stringify(this.mensajes)); }

  // CORRECCIÓN: Autoscroll garantizado
  scrollAlFinal() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(500);
      }
    }, 300);
  }

  async mostrarToast(msj: string) {
    const t = await this.toastCtrl.create({ message: msj, duration: 3000, color: 'danger' });
    t.present();
  }
}