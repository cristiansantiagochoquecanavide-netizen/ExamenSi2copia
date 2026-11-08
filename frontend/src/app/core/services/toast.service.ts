import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  titulo: string;
  mensaje: string;
  duracionMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(tipo: 'success' | 'error' | 'warning' | 'info', titulo: string, mensaje: string, duracionMs: number = 4200): void {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const item: ToastItem = { id, tipo, titulo, mensaje, duracionMs };

    this.toasts.update(list => [...list, item]);

    if (duracionMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duracionMs);
    }
  }

  success(mensaje: string, titulo: string = 'Operación Exitosa'): void {
    this.show('success', titulo, mensaje);
  }

  error(mensaje: string, titulo: string = 'Atención'): void {
    this.show('error', titulo, mensaje, 6000);
  }

  warning(mensaje: string, titulo: string = 'Advertencia'): void {
    this.show('warning', titulo, mensaje, 5000);
  }

  info(mensaje: string, titulo: string = 'Información'): void {
    this.show('info', titulo, mensaje);
  }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
