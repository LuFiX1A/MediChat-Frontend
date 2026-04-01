import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { firstValueFrom } from 'rxjs'; // Recomendado para Angular moderno

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  // 🚩 RECUERDA: Cambia esto por tu URL de Render cuando desplegues
  private apiUrl = 'https://pseudosiphonal-shanel-nonwoven.ngrok-free.dev/analyze-full';

  constructor(private http: HttpClient) { }

  /**
   * Abre la cámara o galería, procesa la imagen y la envía 
   * junto con el texto al "Cerebro Total" del backend.
   */
  // services/chatbot.ts

  async enviarConFoto(texto: string, archivo?: File) { // <--- Agregamos 'archivo?'
    try {
      let blob: Blob;
      let webPath: string | undefined;

      if (archivo) {
        // CASO A: Viene del selector de archivos (PC/Web)
        blob = archivo;
        webPath = URL.createObjectURL(archivo);
      } else {
        // CASO B: Viene de la Cámara Nativa (Capacitor)
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt
        });

        const response = await fetch(image.webPath!);
        blob = await response.blob();
        webPath = image.webPath;
      }

      // 3. Crear el paquete FormData
      const formData = new FormData();
      formData.append('file', blob, `analisis_${Date.now()}.jpg`);
      formData.append('user_text', texto || "Análisis de imagen");

      // 4. Enviar al Backend
      const result = await firstValueFrom(this.http.post(this.apiUrl, formData));

      return {
        ...result,
        fotoUrlLocal: webPath
      };

    } catch (error) {
      console.error("Error en el servicio de Chatbot:", error);
      throw error;
    }
  }

  /**
   * Envía solo texto (sin imagen) al mismo endpoint inteligente.
   */
  async enviarSoloTexto(texto: string) {
    const formData = new FormData();
    formData.append('user_text', texto);

    // Al no agregar 'file', FastAPI lo recibirá como None
    return firstValueFrom(this.http.post(this.apiUrl, formData));
  }
}