import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  // Si usas celular real, cambia localhost por la IP de tu red
  private apiUrl = 'http://localhost:8000/analyze-burn';

  constructor(private http: HttpClient) {}

  async enviarConFoto(texto: string) {
    // 1. Abrir la cámara
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt // Pregunta si usar cámara o galería
    });

    // 2. Convertir la imagen para el envío
    const response = await fetch(image.webPath!);
    const blob = await response.blob();

    // 3. Crear el paquete (FormData)
    const formData = new FormData();
    formData.append('file', blob, 'burn_image.jpg');
    formData.append('user_text', texto);

    // 4. Enviar al Backend
    return this.http.post(this.apiUrl, formData).toPromise();
  }
}
