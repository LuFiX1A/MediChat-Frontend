# MediChat - Mobile Frontend (Ionic & Angular) 📱✨

[![Ionic](https://img.shields.io/badge/Framework-Ionic%207-blue?logo=ionic)](https://ionicframework.com/)
[![Angular](https://img.shields.io/badge/Platform-Angular%2016-dd0031?logo=angular)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178c6?logo=typescript)](https://www.typescriptlang.org/)

## 📝 Descripción
Esta es la aplicación móvil de **MediChat**, una interfaz intuitiva y reactiva diseñada para el triaje de quemaduras. La aplicación permite a los usuarios interactuar con un asistente virtual, capturar fotografías de lesiones cutáneas y recibir un análisis inmediato basado en Inteligencia Artificial.

El objetivo principal es proporcionar una experiencia de usuario (UX) fluida que minimice el estrés en situaciones de emergencia, guiando al usuario paso a paso desde la captura de la imagen hasta la recomendación médica.

---

## 🌟 Funcionalidades Clave
- **Chatbot Multimodal:** Interfaz de chat que procesa tanto texto como imágenes en una misma línea de tiempo.
- **Integración de Cámara:** Uso de la API nativa para captura y carga de archivos multimedia.
- **Renderizado Dinámico:** Sistema de visualización que resalta palabras clave (Grados de quemadura) y estados de confianza.
- **Manejo de Estados:** Gestión de carga (loading states) y errores de conexión mediante observadores asíncronos.
- **Directorio de Especialistas:** Componente dinámico que muestra recomendaciones de doctores solo cuando el análisis lo requiere.

---

## 🏗️ Arquitectura del Frontend
La aplicación sigue el patrón de diseño de **Componentes y Servicios** de Angular:

1.  **Chatbot Component:** Gestiona la lógica de la vista, el scroll automático y la interacción del usuario.
2.  **Chatbot Service:** Centraliza las peticiones HTTP hacia el backend (FastAPI), manejando el envío de `FormData` para las imágenes.
3.  **Modelos de Datos:** Interfaces estrictas en TypeScript para garantizar que la respuesta del backend (grado, confianza, recomendaciones) se procese sin errores.

---

## 🛠️ Stack Tecnológico
- **Framework:** Ionic v7 (Capacitor).
- **Core:** Angular v16.
- **Estilos:** SCSS con variables dinámicas de Ionic para soporte de modo claro/oscuro.
- **Iconografía:** IonIcons.
- **HTTP:** Angular HttpClient para consumo de APIs REST.

---

## 🚀 Instalación y Configuración

### Pre-requisitos
- Node.js & npm
- Ionic CLI (`npm install -g @ionic/cli`)

### Pasos para desplegar
1. **Clonar el proyecto:**
   ```bash
   git clone [https://github.com/tu-usuario/burncare-frontend.git](https://github.com/tu-usuario/burncare-frontend.git)
   cd burncare-frontend

2. **Instalar dependencias:**
   ```bash
   npm install

3. **Configurar el EndPoint:**
   ```TypeScript
   private apiUrl = '[https://tu-url-personalizada.ngrok-free.app/analyze-full](https://tu-url-personalizada.ngrok-free.app/analyze-full)';

4. **Ejecutar en modo desarrollo:**
   ```bash
   ionic serve




