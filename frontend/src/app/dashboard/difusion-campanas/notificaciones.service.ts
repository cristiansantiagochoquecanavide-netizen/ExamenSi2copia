import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Notificacion,
  NotificacionResumen,
  EmitirAlertaTestRequest,
  DispositivoSuscripcion
} from './notificaciones.models';

export interface PushToastData {
  titulo: string;
  mensaje: string;
  accionLabel?: string;
  urlDestino?: string;
  onAccion?: () => void;
  tipo?: string;
}

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
  readonly activePushToast = signal<PushToastData | null>(null);

  private promoTimer: any = null;
  private pushTimer: any = null;
  private pollingInterval: any = null;
  private promoVistasIds = new Set<number>();
  private inicializado = false;

  constructor() {
    this.recuperarPromosVistas();
    this.cargarResumen();
    this.iniciarPollingEnVivo();
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
        } else if (nueva.tipo === 'ESTADO_PEDIDO') {
          this.mostrarPushToast({
            titulo: 'Compra Realizada con éxito',
            mensaje: nueva.mensaje || 'Tu compra ha sido confirmada.',
            accionLabel: 'Ver bolsa o carrito de compras',
            urlDestino: '/ventas/checkout',
            tipo: nueva.tipo
          });
        } else if (nueva.tipo === 'RESERVA_PROBADOR') {
          this.mostrarPushToast({
            titulo: 'Reserva realizada con éxito',
            mensaje: nueva.mensaje || 'Tu cita en el probador está agendada.',
            accionLabel: 'Ver mis reservas',
            urlDestino: '/reservas',
            tipo: nueva.tipo
          });
        }
      })
    );
  }

  // --- GESTIÓN DE TOAST DE PROMOCIONES ---
  mostrarPromoToast(notif: Notificacion): void {
    this.activePromoToast.set(notif);
    this.promoVistasIds.add(notif.id);
    this.guardarPromosVistas();

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

  // --- GESTIÓN DE TOAST PUSH TRANSACCIONAL (COMPRA, RESERVA, ETC.) ---
  mostrarPushToast(toast: PushToastData): void {
    this.activePushToast.set(toast);
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
    }
    // Auto-cierre suave tras 8.5 segundos
    this.pushTimer = setTimeout(() => {
      this.cerrarPushToast();
    }, 8500);
  }

  cerrarPushToast(): void {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
    }
    this.activePushToast.set(null);
  }

  // --- POLLING EN VIVO: DETECCIÓN DE NUEVOS CUPONES Y ALERTAS A LOS ~9s ---
  private iniciarPollingEnVivo(): void {
    // Primer escaneo tras 1.5s de arranque
    setTimeout(() => {
      this.verificarAlertasYPromociones();
    }, 1500);

    // Polling recurrente cada 9 segundos para garantizar la regla de los 10s
    this.pollingInterval = setInterval(() => {
      this.verificarAlertasYPromociones();
    }, 9000);
  }

  private verificarAlertasYPromociones(): void {
    this.http.get<Notificacion[]>(`${this.baseUrl}`, {
      params: new HttpParams().set('tipo', 'PROMOCION').set('limit', '5')
    }).subscribe({
      next: (promos) => {
        if (!promos || promos.length === 0) {
          this.inicializado = true;
          return;
        }

        if (!this.inicializado) {
          // Primera carga: si la última promo vigente no fue vista en esta sesión, mostrarla
          const ultima = promos[0];
          if (!this.promoVistasIds.has(ultima.id) && !ultima.leida) {
            this.mostrarPromoToast(ultima);
          } else {
            promos.forEach(p => this.promoVistasIds.add(p.id));
            this.guardarPromosVistas();
          }
          this.inicializado = true;
        } else {
          // Polling posterior: si apareció un nuevo cupón creado por admin que no teníamos registrado
          for (const p of promos) {
            if (!this.promoVistasIds.has(p.id)) {
              this.mostrarPromoToast(p);
              this.unreadCount.update(c => c + 1);
              this.notifications.update(list => [p, ...list]);
              break; // Mostrar la más reciente
            }
          }
        }
      },
      error: () => {}
    });

    // Actualizar badge de no leídas en silencio
    this.cargarResumen();
  }

  private recuperarPromosVistas(): void {
    try {
      const raw = sessionStorage.getItem('atelier_promos_vistas');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.promoVistasIds = new Set(arr);
        }
      }
    } catch {
      this.promoVistasIds = new Set<number>();
    }
  }

  private guardarPromosVistas(): void {
    try {
      sessionStorage.setItem('atelier_promos_vistas', JSON.stringify(Array.from(this.promoVistasIds)));
    } catch {}
  }

  private actualizarConteoNoLeidas(): void {
    const unread = this.notifications().filter(n => !n.leida).length;
    this.unreadCount.set(unread);
  }
}
