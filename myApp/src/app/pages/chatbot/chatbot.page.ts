import { Component, ViewChild, ElementRef, OnInit, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonIcon, ToastController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatbotService } from '../../services/chatbot';
import { addIcons } from 'ionicons';
import {
  camera, send, medkitOutline, chatbubbleEllipsesOutline,
  cameraOutline, medicalOutline, trashOutline, alertCircle,
  alertCircleOutline, informationCircleOutline, personCircleOutline,
  closeOutline, shieldCheckmarkOutline, pulseOutline, checkmarkCircleOutline
} from 'ionicons/icons';

interface ChatMensaje {
  rol: 'usuario' | 'bot';
  texto: string;
  imagen?: string | null;
  hora?: string;
  pautas?: string[];
  recomendaciones?: Array<{
    nombre_doctor: string;
    especialidad: string;
    id?: string;
  }>;
  grado?: number | string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: true,
  imports: [
    IonIcon,
    FormsModule,
    CommonModule,
  ],
})
export class ChatbotPage implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('chatTextarea') chatTextarea?: ElementRef<HTMLTextAreaElement>;

  mensajeUsuario: string = '';
  mensajes: ChatMensaje[] = [];
  cargando: boolean = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  private shouldScrollToBottom: boolean = false;

  constructor(
    private chatbotService: ChatbotService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router
  ) {
    addIcons({
      camera,
      send,
      medkitOutline,
      chatbubbleEllipsesOutline,
      cameraOutline,
      medicalOutline,
      trashOutline,
      alertCircle,
      alertCircleOutline,
      informationCircleOutline,
      personCircleOutline,
      closeOutline,
      shieldCheckmarkOutline,
      pulseOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    const historial = localStorage.getItem('chat_history');
    if (historial) {
      try {
        this.mensajes = JSON.parse(historial);
      } catch (e) {
        console.error('Error parseando historial:', e);
        this.mensajes = [];
      }
    }
    this.requestScroll();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  async onFileSelected(event: any): Promise<void> {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    this.selectedFile = archivo;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
      this.requestScroll();
    };
    reader.readAsDataURL(archivo);
  }

  cancelarImagen(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onTextareaKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarTodo();
    }
  }

  usarSugerencia(texto: string): void {
    this.mensajeUsuario = texto;
    this.enviarTodo();
  }

  async enviarTodo(): Promise<void> {
    if ((!this.mensajeUsuario.trim() && !this.selectedFile) || this.cargando) {
      return;
    }

    const imgParaChat = this.previewUrl;
    const txtParaChat = this.mensajeUsuario.trim() || 'Análisis de imagen';
    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.mensajes.push({
      rol: 'usuario',
      texto: txtParaChat,
      imagen: imgParaChat,
      hora: horaActual,
    });

    const fileAEnviar = this.selectedFile;
    this.mensajeUsuario = '';
    this.cancelarImagen();
    this.cargando = true;
    this.requestScroll();

    try {
      let res: any;
      if (fileAEnviar) {
        res = await this.chatbotService.enviarConFoto(txtParaChat, fileAEnviar);
      } else {
        res = await this.chatbotService.enviarSoloTexto(txtParaChat);
      }

      const horaBot = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      this.mensajes.push({
        rol: 'bot',
        texto: res.diagnostico_ia?.mensaje_al_usuario || res.mensaje || 'Información procesada exitosamente.',
        pautas: res.diagnostico_ia?.pautas_inmediatas || [],
        recomendaciones: res.diagnostico_ia?.recomendaciones || [],
        grado: res.grado_quemadura,
        hora: horaBot,
      });

      this.guardarEnLocal();
    } catch (e) {
      this.mostrarToast('Error de conexión con el servicio de IA de MediChat.');
    } finally {
      this.cargando = false;
      this.requestScroll();
    }
  }

  agendarCon(doc: any): void {
    this.router.navigate(['/citas']);
  }

  async confirmarLimpieza(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: '¿Limpiar conversación?',
      message: 'Se eliminará el historial de consultas de esta sesión de MediChat.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            this.mensajes = [];
            localStorage.removeItem('chat_history');
          },
        },
      ],
    });
    await alert.present();
  }

  async mostrarInfoLegal(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'MediChat · Inteligencia Clínica',
      subHeader: 'Versión 2.0 Enterprise',
      message:
        'MediChat emplea modelos de IA para apoyo en triaje y clasificación preliminar de lesiones o sintomatología.\n\n' +
        '• Las imágenes enviadas se procesan de manera segura bajo cifrado.\n' +
        '• Esta herramienta es de orientación y soporte asistencial, no reemplaza la consulta o diagnóstico de un médico matriculado.',
      buttons: [{ text: 'Entendido', role: 'cancel' }],
    });
    await alert.present();
  }

  botonAbrirCamara(): void {
    this.fileInput.nativeElement.click();
  }

  guardarEnLocal(): void {
    localStorage.setItem('chat_history', JSON.stringify(this.mensajes));
  }

  requestScroll(): void {
    this.shouldScrollToBottom = true;
  }

  private scrollToBottom(): void {
    if (this.scrollContainer?.nativeElement) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  async mostrarToast(msj: string): Promise<void> {
    const t = await this.toastCtrl.create({ message: msj, duration: 3200, color: 'danger' });
    await t.present();
  }
}