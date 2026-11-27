import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    alertCircleOutline,
    attachOutline,
    calendarOutline,
    cameraOutline,
    chatbubbleEllipsesOutline,
    checkmarkCircleOutline,
    closeOutline,
    documentTextOutline,
    flashOutline,
    informationCircleOutline,
    medicalOutline,
    medkitOutline,
    personCircleOutline,
    pulseOutline,
    send,
    shieldCheckmarkOutline,
    timeOutline,
    trashOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { formatDateShort, todayISO } from '../../core/format';
import { Appointment, Patient, RiskLevel, SessionUser, SystemUser } from '../../core/models';
import { badgeClass } from '../../core/ui';
import { ChatbotService } from '../../services/chatbot';

interface ChatMensaje {
    rol: 'usuario' | 'bot';
    texto: string;
    imagen?: string | null;
    hora?: string;
    pautas?: string[];
    recomendaciones?: Array<{
        nombre_doctor: string;
        especialidad: string;
        mongo_id?: string;
        id_mongo?: string;
    }>;
    grado?: number | string;
}

@Component({
    selector: 'app-patient-portal',
    templateUrl: './patient-portal.page.html',
    styleUrls: ['./patient-portal.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonIcon],
})
export class PatientPortalPage implements OnInit {
    @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
    @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

    user: SessionUser | null = null;
    patientRecord: Patient | undefined;

    mensajeUsuario = '';
    cargando = false;
    selectedFile: File | null = null;
    previewUrl: string | null = null;
    mensajes: ChatMensaje[] = [];

    requestSentBanner = false;
    showRequestModal = false;
    requestDoctorName = '';
    requestSpecialty = 'Medicina General';
    requestSymptoms = '';
    requestPreferredDate = todayISO();
    requestUrgent = false;
    requestError = '';

    lastDetectedSymptoms = '';
    lastDetectedRisk: RiskLevel = 'Medio';
    lastBurnGrade: number | null = null;

    constructor(
        private auth: AuthService,
        private data: DataService,
        private chatbotService: ChatbotService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController,
    ) {
        addIcons({
            alertCircleOutline,
            attachOutline,
            calendarOutline,
            cameraOutline,
            chatbubbleEllipsesOutline,
            checkmarkCircleOutline,
            closeOutline,
            documentTextOutline,
            flashOutline,
            informationCircleOutline,
            medicalOutline,
            medkitOutline,
            personCircleOutline,
            pulseOutline,
            send,
            shieldCheckmarkOutline,
            timeOutline,
            trashOutline,
        });
    }

    ngOnInit(): void {
        this.user = this.auth.current();
        this.linkOrCreatePatientProfile();
        this.resetChatWelcome();
    }

    private linkOrCreatePatientProfile(): void {
        if (!this.user) {
            return;
        }

        if (this.user.patientId) {
            this.patientRecord = this.data.getPatient(this.user.patientId);
        }

        if (!this.patientRecord) {
            this.patientRecord = this.data.patients.find(
                (p) => p.email.toLowerCase() === this.user!.email.toLowerCase(),
            );
        }

        if (!this.patientRecord) {
            this.patientRecord = this.data.addPatient({
                id: this.user.patientId || `pac-${Date.now()}`,
                name: this.user.name,
                document: `PAC-${Math.floor(100000 + Math.random() * 900000)}`,
                birthDate: '1996-01-01',
                age: 30,
                sex: 'M',
                bloodType: 'O+',
                phone: 'Sin registrar',
                email: this.user.email,
                address: 'Calvillo, Aguascalientes',
                insurance: 'Particular / Afiliado MediChat',
                lastVisit: todayISO(),
                risk: 'Bajo',
                status: 'Activo',
                allergies: [],
                conditions: [],
                medications: [],
                vitals: {
                    pressure: '120/80',
                    heartRate: 72,
                    temperature: 36.5,
                    weight: 70,
                    height: 1.7,
                },
                consultations: [],
                triageNotes: [],
                color: '#0ea5e9',
            });
        }
    }

    private resetChatWelcome(): void {
        const firstName = this.user?.name.split(' ')[0] ?? 'Paciente';
        this.mensajes = [
            {
                rol: 'bot',
                texto:
                    `¡Hola, ${firstName}! Soy MediChat AI, tu asistente de orientación médica previa.\n\n` +
                    `Cuéntame qué síntomas presentas o adjunta una fotografía si tienes una lesión o quemadura cutánea. ` +
                    `Analizaré tu caso y te ayudaré a solicitar cita con el especialista adecuado.`,
                hora: this.currentTime(),
            },
        ];
    }

    get availableDoctors(): SystemUser[] {
        return this.data.activeDoctors;
    }

    get myAppointments(): Appointment[] {
        if (!this.patientRecord) {
            return [];
        }
        return this.data.appointments.filter((a) => a.patientId === this.patientRecord!.id);
    }

    prettyDate(iso: string): string {
        return formatDateShort(iso);
    }

    badge(value: string): string {
        return badgeClass(value);
    }

    private currentTime(): string {
        return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            const el = this.scrollContainer?.nativeElement;
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        }, 60);
    }

    usarSugerencia(texto: string): void {
        this.mensajeUsuario = texto;
        void this.enviarTodo();
    }

    botonAbrirCamara(): void {
        if (this.fileInput?.nativeElement) {
            this.fileInput.nativeElement.click();
            return;
        }
        const input = document.querySelector<HTMLInputElement>('input[type="file"]');
        input?.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.selectedFile = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                this.previewUrl = reader.result as string;
            };
            reader.readAsDataURL(this.selectedFile);
        }
    }

    cancelarImagen(): void {
        this.selectedFile = null;
        this.previewUrl = null;
    }

    onTextareaKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void this.enviarTodo();
        }
    }

    private extractAiPayload(res: any): {
        texto: string;
        pautas: string[];
        recomendaciones: Array<{
            nombre_doctor: string;
            especialidad: string;
            mongo_id?: string;
            id_mongo?: string;
        }>;
    } {
        const ia = res?.diagnostico_ia || res?.ai_diagnosis || res?.response || res?.respuesta || res || {};

        const texto =
            ia?.mensaje_al_usuario ||
            ia?.user_message ||
            res?.mensaje_al_usuario ||
            res?.user_message ||
            res?.mensaje_asistente ||
            (typeof res?.respuesta === 'string' ? res.respuesta : '') ||
            res?.mensaje ||
            '';

        const pautasRaw =
            ia?.pautas_inmediatas ||
            ia?.immediate_guidelines ||
            res?.pautas_primeros_auxilios ||
            res?.pautas ||
            [];
        const pautas = Array.isArray(pautasRaw) ? pautasRaw : [];

        const recsRaw =
            ia?.recomendaciones ||
            ia?.recommendations ||
            res?.recomendaciones_medicas ||
            res?.recomendaciones ||
            [];

        const recomendaciones = Array.isArray(recsRaw)
            ? recsRaw
                .map((r: any) => ({
                    nombre_doctor: r?.nombre_doctor || r?.doctor_name || '',
                    especialidad: r?.especialidad || r?.specialty || 'Medicina General',
                    mongo_id: r?.mongo_id || r?.id_mongo,
                    id_mongo: r?.id_mongo || r?.mongo_id,
                }))
                .filter((r) => Boolean(r.nombre_doctor))
            : [];

        return { texto, pautas, recomendaciones };
    }

    async enviarTodo(): Promise<void> {
        const texto = this.mensajeUsuario.trim();
        if ((!texto && !this.selectedFile) || this.cargando) {
            return;
        }

        if (texto) {
            this.lastDetectedSymptoms = this.lastDetectedSymptoms
                ? `${this.lastDetectedSymptoms}; ${texto}`
                : texto;
        }

        this.mensajes.push({
            rol: 'usuario',
            texto: texto || 'Fotografía adjunta para evaluación visual',
            imagen: this.previewUrl,
            hora: this.currentTime(),
        });
        this.scrollToBottom();

        const imagenParaEnviar = this.selectedFile;
        this.mensajeUsuario = '';
        this.cancelarImagen();
        this.cargando = true;

        try {
            if (imagenParaEnviar) {
                const res: any = await this.chatbotService.enviarConFoto(texto, imagenParaEnviar);
                this.cargando = false;

                const analisisVisual = res?.analisis_visual || res?.visual_analysis || {};
                const grado = Number(
                    analisisVisual.grado ??
                    analisisVisual.grade ??
                    res?.grado_detectado ??
                    res?.grado ??
                    1,
                );
                const parsed = this.extractAiPayload(res);

                this.lastBurnGrade = grado;
                this.lastDetectedRisk = grado >= 3 ? 'Alto' : grado === 2 ? 'Medio' : 'Bajo';
                this.requestSpecialty = parsed.recomendaciones[0]?.especialidad || 'Dermatología';

                const textoBot =
                    parsed.texto ||
                    `Evaluación visual completada: posible quemadura de Grado ${grado}. Se sugiere valoración por ${this.requestSpecialty}.`;

                this.mensajes.push({
                    rol: 'bot',
                    texto: textoBot,
                    pautas: parsed.pautas,
                    recomendaciones: parsed.recomendaciones,
                    grado,
                    hora: this.currentTime(),
                });
                this.scrollToBottom();

                await this.persistTriageNote(
                    texto || `Evaluación visual de lesión (Grado ${grado})`,
                    parsed.recomendaciones[0]?.nombre_doctor ||
                    this.availableDoctors[0]?.name ||
                    'Especialista asignado',
                    this.requestSpecialty,
                );
            } else {
                const res: any = await this.chatbotService.enviarSoloTexto(texto);
                this.cargando = false;

                const parsed = this.extractAiPayload(res);
                const especialidadSugerida =
                    parsed.recomendaciones[0]?.especialidad ||
                    res?.especialidad_sugerida ||
                    this.requestSpecialty;
                this.requestSpecialty = especialidadSugerida;

                const lower = texto.toLowerCase();
                if (
                    lower.includes('pecho') ||
                    lower.includes('respirar') ||
                    lower.includes('desmayo') ||
                    lower.includes('sangrado')
                ) {
                    this.lastDetectedRisk = 'Alto';
                } else {
                    this.lastDetectedRisk = 'Medio';
                }

                const textoBot =
                    parsed.texto ||
                    'He registrado tus síntomas. Te sugiero agendar una valoración clínica.';

                this.mensajes.push({
                    rol: 'bot',
                    texto: textoBot,
                    pautas: parsed.pautas,
                    recomendaciones: parsed.recomendaciones,
                    hora: this.currentTime(),
                });
                this.scrollToBottom();

                await this.persistTriageNote(
                    texto,
                    parsed.recomendaciones[0]?.nombre_doctor ||
                    this.availableDoctors[0]?.name ||
                    'Médico general',
                    especialidadSugerida,
                );
            }
        } catch {
            this.cargando = false;
            this.mensajes.push({
                rol: 'bot',
                texto:
                    'No pude contactar con el servidor de IA en este momento, pero he guardado tus síntomas para que solicites tu cita médica.',
                hora: this.currentTime(),
            });
            this.scrollToBottom();
        }
    }

    private async persistTriageNote(summary: string, doctor: string, specialty: string): Promise<void> {
        if (!this.patientRecord) {
            return;
        }
        const saved = await this.data.saveTriageNote(this.patientRecord.id, {
            summary,
            recommended_doctor: doctor,
            recommended_specialty: specialty,
            burn_grade: this.lastBurnGrade,
        });

        if (!saved) {
            this.patientRecord.triageNotes = [
                {
                    id: `tri-${Date.now()}`,
                    date: todayISO(),
                    time: this.currentTime(),
                    summary,
                    nlpRisk: this.lastDetectedRisk,
                    burnGrade: this.lastBurnGrade,
                    recommendedDoctor: doctor,
                    recommendedSpecialty: specialty,
                },
                ...(this.patientRecord.triageNotes ?? []),
            ];
        }
    }

    onDoctorChange(doctorName: string): void {
        const found = this.availableDoctors.find((d) => d.name === doctorName);
        if (found?.specialty) {
            this.requestSpecialty = found.specialty;
        }
    }

    openRequestAppointmentModal(doc?: { nombre_doctor?: string; especialidad?: string }): void {
        this.requestError = '';
        this.requestPreferredDate = todayISO();
        this.requestUrgent = this.lastDetectedRisk === 'Alto';

        if (doc?.nombre_doctor) {
            this.requestDoctorName = doc.nombre_doctor;
        } else if (this.availableDoctors.length > 0) {
            this.requestDoctorName = this.availableDoctors[0].name;
        } else {
            this.requestDoctorName = 'Dra. Valentina Ortiz';
        }

        if (doc?.especialidad) {
            this.requestSpecialty = doc.especialidad;
        } else {
            this.onDoctorChange(this.requestDoctorName);
        }

        this.requestSymptoms =
            this.lastDetectedSymptoms || 'Valoración médica general solicitada desde MediChat AI';
        this.showRequestModal = true;
    }

    openRequestWithSystemDoctor(doc: SystemUser): void {
        this.requestError = '';
        this.requestPreferredDate = todayISO();
        this.requestUrgent = this.lastDetectedRisk === 'Alto';
        this.requestDoctorName = doc.name;
        this.requestSpecialty = doc.specialty || 'Medicina General';
        this.requestSymptoms =
            this.lastDetectedSymptoms || 'Valoración médica general solicitada desde MediChat AI';
        this.showRequestModal = true;
    }

    closeRequestModal(): void {
        this.showRequestModal = false;
    }

    async submitAppointmentRequest(): Promise<void> {
        this.requestError = '';

        if (!this.patientRecord) {
            this.requestError = 'No se encontró tu ficha de paciente.';
            return;
        }

        if (!this.requestSymptoms.trim()) {
            this.requestError = 'Por favor describe brevemente tus síntomas o el motivo de tu cita.';
            return;
        }

        const reasonPrefix = this.requestUrgent ? '[URGENTE - MediChat IA]' : '[Pre-triaje MediChat]';

        this.data.addAppointment({
            patientId: this.patientRecord.id,
            patientName: this.patientRecord.name,
            date: this.requestUrgent ? todayISO() : this.requestPreferredDate || todayISO(),
            time: this.requestUrgent ? '08:00' : '09:00',
            duration: 30,
            specialty: this.requestSpecialty || 'Medicina General',
            doctor: this.requestDoctorName || 'Dra. Valentina Ortiz',
            reason: `${reasonPrefix} ${this.requestSymptoms.trim()}`,
            status: 'Pendiente',
            origin: 'MediChat',
            urgent: this.requestUrgent,
            priorityScore: this.requestUrgent ? 3 : this.lastDetectedRisk === 'Alto' ? 3 : 2,
        });

        this.data.log(
            this.requestUrgent ? 'Solicitud de cita urgente (MediChat)' : 'Solicitud de cita (MediChat)',
            'Portal del paciente',
            `${this.patientRecord.name} solicitó cita con ${this.requestDoctorName} (${this.requestSpecialty}).`,
            this.requestUrgent ? 'warning' : 'info',
        );

        this.showRequestModal = false;
        this.requestSentBanner = true;

        const toast = await this.toastCtrl.create({
            message: this.requestUrgent
                ? 'Solicitud urgente enviada al equipo médico. Te confirmaremos horario de inmediato.'
                : 'Tu solicitud de cita ha sido enviada al médico para confirmación.',
            duration: 3500,
            color: 'success',
            position: 'top',
        });
        await toast.present();
    }

    async mostrarInfoLegal(): Promise<void> {
        const alert = await this.alertCtrl.create({
            header: 'Aviso Clínico y Privacidad',
            message:
                'MediChat AI proporciona orientación clínica previa y pre-triaje asistido. ' +
                'No sustituye una consulta médica presencial. Tus síntomas y evaluación se comparten ' +
                'de forma cifrada únicamente con el médico seleccionado.',
            buttons: ['Entendido'],
        });
        await alert.present();
    }

    async confirmarLimpieza(): Promise<void> {
        const alert = await this.alertCtrl.create({
            header: 'Nueva consulta en MediChat',
            message: '¿Deseas reiniciar la conversación actual con el asistente?',
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Reiniciar',
                    handler: () => {
                        this.lastDetectedSymptoms = '';
                        this.lastBurnGrade = null;
                        this.resetChatWelcome();
                    },
                },
            ],
        });
        await alert.present();
    }
}