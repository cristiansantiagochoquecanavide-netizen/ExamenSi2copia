import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardReporteResponse, AnalisisVozResponse, ConsultaVozRequest } from '../models/reportes.models';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reportes`;

  private recognition: any = null;
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;

  constructor() {
    this.initSpeechRecognition();
  }

  // =========================================================================
  // 1. ENDPOINTS HTTP
  // =========================================================================

  getDashboard(
    rango: string = '30D',
    granularidad: string = 'MES',
    sucursalId?: number,
    mes?: number,
    anio?: number
  ): Observable<DashboardReporteResponse> {
    let url = `${this.apiUrl}/dashboard?rango=${rango}&granularidad=${granularidad}`;
    if (sucursalId) {
      url += `&sucursal_id=${sucursalId}`;
    }
    if (mes) {
      url += `&mes=${mes}`;
    }
    if (anio) {
      url += `&anio=${anio}`;
    }
    return this.http.get<DashboardReporteResponse>(url);
  }

  analizarConsultaVoz(query: string, rangoTiempo?: string, sucursalId?: number): Observable<AnalisisVozResponse> {
    const body: ConsultaVozRequest = {
      query,
      rango_tiempo: rangoTiempo || '30D',
      sucursal_id: sucursalId
    };
    return this.http.post<AnalisisVozResponse>(`${this.apiUrl}/analisis-voz`, body);
  }

  exportarCSV(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/exportar`, {
      responseType: 'blob'
    });
  }

  // =========================================================================
  // 2. WEB SPEECH RECOGNITION (ESCUCHA DE VOZ)
  // =========================================================================

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';
    }
  }

  isSpeechRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  startListening(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (error: any) => void,
    onEnd: () => void
  ): void {
    if (!this.recognition) {
      onError(new Error('El navegador no soporta SpeechRecognition nativo.'));
      return;
    }

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        onInterim(interim);
      }
      if (final) {
        onFinal(final.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      onError(event);
    };

    this.recognition.onend = () => {
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      onError(e);
    }
  }

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  // =========================================================================
  // 3. WEB SPEECH SYNTHESIS (TEXT-TO-SPEECH EN ESPAÑOL)
  // =========================================================================

  isSpeechSynthesisSupported(): boolean {
    return this.synth !== null;
  }

  speakText(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (!this.synth) return;

    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = this.synth.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') || v.lang.includes('Spanish'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    if (onStart) {
      utterance.onstart = () => onStart();
    }
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
