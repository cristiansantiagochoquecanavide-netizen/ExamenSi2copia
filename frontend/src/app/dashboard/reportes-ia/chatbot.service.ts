import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MensajeChat, MensajeChatCreate, SesionChat } from './ia-asistente.models';

const STORAGE_SESSION_KEY = 'fashionstore_concierge_session_uuid';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ia_asistente`;

  // Reactive State
  readonly isOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isListening = signal<boolean>(false);
  readonly sessionUuid = signal<string | null>(null);
  readonly messages = signal<MensajeChat[]>([]);

  private speechRecognition: any = null;

  constructor() {
    this.initSpeechRecognition();
    this.restoreSession();
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'es-ES';

      this.speechRecognition.onend = () => {
        this.isListening.set(false);
      };

      this.speechRecognition.onerror = () => {
        this.isListening.set(false);
      };
    }
  }

  private restoreSession(): void {
    const savedUuid = localStorage.getItem(STORAGE_SESSION_KEY);
    if (savedUuid) {
      this.sessionUuid.set(savedUuid);
      this.loadSessionHistory(savedUuid);
    } else {
      this.setDefaultWelcomeMessage();
    }
  }

  private setDefaultWelcomeMessage(): void {
    this.messages.set([
      {
        remitente: 'ASISTENTE',
        texto: '¡Hola! Soy **Atelier Concierge**, tu estilista virtual y asistente personal de alta costura en FashionStore. ¿Qué prenda u ocasión estás buscando hoy?',
        sugerencias_rapidas: [
          'Vestidos para fiesta de gala',
          'Blazers y sastrería para oficina',
          '¿Cómo reservo un probador físico?',
          'Consultar stock en tiendas'
        ],
        created_at: new Date().toISOString()
      }
    ]);
  }

  toggleOpen(): void {
    this.isOpen.update(open => !open);
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  loadSessionHistory(uuid: string): void {
    this.isLoading.set(true);
    this.http.get<SesionChat>(`${this.baseUrl}/chat/${uuid}`).subscribe({
      next: (session) => {
        if (session && session.mensajes && session.mensajes.length > 0) {
          this.messages.set(session.mensajes);
        } else {
          this.setDefaultWelcomeMessage();
        }
        this.isLoading.set(false);
      },
      error: () => {
        // Si la sesión expiró o no existe en DB, reiniciar estado
        localStorage.removeItem(STORAGE_SESSION_KEY);
        this.sessionUuid.set(null);
        this.setDefaultWelcomeMessage();
        this.isLoading.set(false);
      }
    });
  }

  sendMessage(userText: string): void {
    const trimmed = userText.trim();
    if (!trimmed || this.isLoading()) return;

    // 1. Mensaje visual del usuario inmediato
    const userMsg: MensajeChat = {
      remitente: 'USUARIO',
      texto: trimmed,
      created_at: new Date().toISOString()
    };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.isLoading.set(true);

    const payload: MensajeChatCreate = {
      texto: trimmed,
      session_uuid: this.sessionUuid()
    };

    // 2. Llamada HTTP al backend RAG
    this.http.post<MensajeChat>(`${this.baseUrl}/chat`, payload).subscribe({
      next: (botMsg) => {
        if (botMsg.session_uuid) {
          this.sessionUuid.set(botMsg.session_uuid);
          localStorage.setItem(STORAGE_SESSION_KEY, botMsg.session_uuid);
        }
        this.messages.update(msgs => [...msgs, botMsg]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al comunicarse con Atelier Concierge:', err);
        const errorMsg: MensajeChat = {
          remitente: 'ASISTENTE',
          texto: 'Disculpá, ocurrió un percance momentáneo en la boutique virtual. Por favor reintentá tu consulta en unos instantes.',
          created_at: new Date().toISOString()
        };
        this.messages.update(msgs => [...msgs, errorMsg]);
        this.isLoading.set(false);
      }
    });
  }

  startNewSession(): void {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    this.sessionUuid.set(null);
    this.setDefaultWelcomeMessage();
  }

  toggleVoiceRecognition(onResultCallback: (spokenText: string) => void): void {
    if (!this.speechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo (Web Speech API). Podés escribir normalmente en el campo de texto.');
      return;
    }

    if (this.isListening()) {
      this.speechRecognition.stop();
      this.isListening.set(false);
    } else {
      this.speechRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResultCallback(transcript);
        }
        this.isListening.set(false);
      };

      try {
        this.speechRecognition.start();
        this.isListening.set(true);
      } catch (e) {
        console.error('Error starting speech recognition:', e);
        this.isListening.set(false);
      }
    }
  }
}
