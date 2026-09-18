import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Notificacion,
  NotificacionResumen,
  EmitirAlertaTestRequest,
  DispositivoSuscripcion
} from '../models/notificaciones.models';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notificaciones`;

  readonly unreadCount = signal<number>(0);
  readonly notifications = signal<Notificacion[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly activePromoToast = signal<Notificacion | null>(null);

  private promoTimer: any = null;

  constructor() {
    this.cargarResumen();
    this.verificarPromoActiva();
  }

  toggleOpen(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.cargarNotificaciones();
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  cargarResumen(): void {
    this.http.get<NotificacionResumen>(`${this.baseUrl}/resumen`).subscribe({
      next: (res) => {
        this.unreadCount.set(res.total_no_leidas);
      },
      error: (err) => console.error('Error cargando resumen de notificaciones:', err)
    });
  }

  cargarNotificaciones(tipo?: string, soloNoLeidas: boolean = false): void {
    this.isLoading.set(true);
    let params = new HttpParams().set('limit', '40');
    if (tipo && tipo !== 'TODAS') {
      params = params.set('tipo', tipo);
    }
    if (soloNoLeidas) {
      params = params.set('solo_no_leidas', 'true');
    }

    this.http.get<Notificacion[]>(`${this.baseUrl}`, { params }).subscribe({
      next: (items) => {
        this.notifications.set(items);
        this.isLoading.set(false);
        this.actualizarConteoNoLeidas();
      },
      error: (err) => {
        console.error('Error cargando lista de notificaciones:', err);
        this.isLoading.set(false);
      }
    });
  }

  marcarLeida(id: number): void {
    this.http.patch<Notificacion>(`${this.baseUrl}/${id}/leer`, {}).subscribe({
      next: (updated) => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, leida: true, fecha_leida: updated.fecha_leida } : n)
        );
        this.actualizarConteoNoLeidas();
      },
      error: (err) => console.error('Error marcando notificación como leída:', err)
    });
  }

  marcarTodasLeidas(): void {
    this.http.post<{ message: string; actualizadas: number }>(`${this.baseUrl}/leer-todas`, {}).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, leida: true })));
        this.unreadCount.set(0);
      },
      error: (err) => console.error('Error marcando todas como leídas:', err)
    });
  }

  eliminarNotificacion(id: number): void {
    this.http.delete(`${this.baseUrl}/${id}`).subscribe({
      next: () => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        this.actualizarConteoNoLeidas();
      },
      error: (err) => console.error('Error eliminando notificación:', err)
    });
  }

  emitirAlertaTest(tipo: string): Observable<Notificacion> {
    const payload: EmitirAlertaTestRequest = { tipo };
    return this.http.post<Notificacion>(`${this.baseUrl}/emitir-test`, payload).pipe(
      tap((nueva) => {
        this.notifications.update(list => [nueva, ...list]);
        this.unreadCount.update(c => c + 1);
        if (nueva.tipo === 'PROMOCION') {
          this.mostrarPromoToast(nueva);
        }
      })
    );
  }

  mostrarPromoToast(notif: Notificacion): void {
    this.activePromoToast.set(notif);
    if (this.promoTimer) {
      clearTimeout(this.promoTimer);
    }
    // Auto-cierre suave tras 8 segundos
    this.promoTimer = setTimeout(() => {
      this.cerrarPromoToast();
    }, 8000);
  }

  cerrarPromoToast(): void {
    if (this.promoTimer) {
      clearTimeout(this.promoTimer);
    }
    this.activePromoToast.set(null);
  }

  verificarPromoActiva(): void {
    const yaMostrada = sessionStorage.getItem('atelier_promo_toast_seen');
    if (yaMostrada) return;

    this.http.get<Notificacion[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('tipo', 'PROMOCION').set('solo_no_leidas', 'true').set('limit', '1')
    }).subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          setTimeout(() => {
            this.mostrarPromoToast(items[0]);
            sessionStorage.setItem('atelier_promo_toast_seen', 'true');
          }, 1800);
        }
      },
      error: () => {}
    });
  }

  private actualizarConteoNoLeidas(): void {
    const unread = this.notifications().filter(n => !n.leida).length;
    this.unreadCount.set(unread);
  }
}
