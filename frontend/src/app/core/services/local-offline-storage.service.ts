/**
 * FashionStore - Angular Service para Presentación 2 (CU08, CU14, CU15, CU16)
 * Almacenamiento Local en IndexedDB y Sincronización Batch Idempotente
 * INF412 - Sistemas de Información 2
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PrendaLocal {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  talla: string;
  color: string;
  stock_disponible: number;
  pecho_cm?: number;
  cintura_cm?: number;
}

export interface ReservaProbadorLocal {
  uuid: string;
  prenda_id: number;
  nombre_prenda: string;
  talla: string;
  hora_ensayo: string;
  requiere_pago: boolean; // Siempre false para probador físico en tienda
  monto: number;          // 0.00
  fecha_creacion: string;
  estado: string;
}

export interface VentaContadoLocal {
  uuid: string;
  monto_total: number;
  metodo_pago: 'EFECTIVO';
  items: Array<{ variante_id: number; nombre: string; cantidad: number; precio: number }>;
  fecha_registro: string;
  estado: string;
}

export interface SincronizacionResultadoItem {
  uuid_operacion: string;
  tipo_operacion: string;
  estado: string; // SINCRONIZADO, DUPLICADO_IDEMPOTENTE, CONFLICTO_STOCK, ERROR
  mensaje: string;
  codigo_referencia?: string;
}

export interface SincronizacionBatchResponse {
  total_recibidos: number;
  procesados_exitosamente: number;
  duplicados_idempotentes: number;
  conflictos_stock: number;
  errores: number;
  resultados: SincronizacionResultadoItem[];
}

@Injectable({
  providedIn: 'root'
})
export class LocalOfflineStorageService {
  private readonly DB_NAME = 'FashionStoreLocalDB';
  private readonly DB_VERSION = 2;
  private db: IDBDatabase | null = null;
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public isOnline$ = new BehaviorSubject<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  public pendingCount$ = new BehaviorSubject<number>(0);

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.openDatabase().then(() => {
        this.actualizarConteoPendientes();
      });
      this.initNetworkListeners();
    }
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      this.actualizarConteoPendientes();
    });

    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        return reject(new Error('IndexedDB no está soportado en este entorno.'));
      }

      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        // 1. Almacén para CU08 (Catálogo en memoria local)
        if (!db.objectStoreNames.contains('catalogo')) {
          db.createObjectStore('catalogo', { keyPath: 'id' });
        }
        // 2. Almacén para CU14 (Reservas de probador sin pago)
        if (!db.objectStoreNames.contains('reservas_offline')) {
          db.createObjectStore('reservas_offline', { keyPath: 'uuid' });
        }
        // 3. Almacén para CU15 (Ventas de contado offline con UUIDv4)
        if (!db.objectStoreNames.contains('ventas_offline')) {
          db.createObjectStore('ventas_offline', { keyPath: 'uuid' });
        }
      };

      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };

      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // CU08: Almacenar y Consultar Catálogo Local
  // ==========================================
  public descargarYSincronizarCatalogo(): Observable<PrendaLocal[]> {
    return this.http.get<PrendaLocal[]>(`${this.apiUrl}/catalogo/sincronizar-local`).pipe(
      tap(prendas => {
        this.guardarCatalogoLocal(prendas);
      })
    );
  }

  public guardarCatalogoLocal(prendas: PrendaLocal[]): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = this.db || await this.openDatabase();
        const tx = db.transaction('catalogo', 'readwrite');
        const store = tx.objectStore('catalogo');
        store.clear();
        prendas.forEach(p => store.put(p));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public obtenerCatalogoLocal(): Observable<PrendaLocal[]> {
    return from(new Promise<PrendaLocal[]>(async (resolve, reject) => {
      try {
        const db = this.db || await this.openDatabase();
        const tx = db.transaction('catalogo', 'readonly');
        const req = tx.objectStore('catalogo').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve([]);
      }
    }));
  }

  // ====================================================
  // CU14: Registrar Reserva para Probador Físico Sin Pago
  // ====================================================
  public registrarReservaProbadorOffline(datos: {
    prenda_id: number;
    nombre_prenda: string;
    talla: string;
    hora_ensayo: string;
  }): Observable<string> {
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'res-' + Math.random().toString(36).substring(2, 10);

    const reserva: ReservaProbadorLocal = {
      uuid: uuid,
      prenda_id: datos.prenda_id,
      nombre_prenda: datos.nombre_prenda,
      talla: datos.talla,
      hora_ensayo: datos.hora_ensayo,
      requiere_pago: false,
      monto: 0.00,
      fecha_creacion: new Date().toISOString(),
      estado: 'PENDIENTE_ENSAYO_TIENDA'
    };

    return from(new Promise<string>(async (resolve, reject) => {
      try {
        const db = this.db || await this.openDatabase();
        const tx = db.transaction('reservas_offline', 'readwrite');
        tx.objectStore('reservas_offline').put(reserva);
        tx.oncomplete = () => {
          this.actualizarConteoPendientes();
          resolve(uuid);
        };
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    }));
  }

  public obtenerReservasOffline(): Observable<ReservaProbadorLocal[]> {
    return from(new Promise<ReservaProbadorLocal[]>(async (resolve, reject) => {
      try {
        const db = this.db || await this.openDatabase();
        const tx = db.transaction('reservas_offline', 'readonly');
        const req = tx.objectStore('reservas_offline').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve([]);
      }
    }));
  }

  // ====================================================
  // CU15: Registrar Venta de Contado Offline con UUIDv4
  // ====================================================
  public registrarVentaContadoOffline(datos: {
    monto_total: number;
    items: Array<{ variante_id: number; nombre: string; cantidad: number; precio: number }>;
  }): Observable<string> {
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'vta-' + Math.random().toString(36).substring(2, 10);

    const venta: VentaContadoLocal = {
      uuid: uuid,
      monto_total: datos.monto_total,
      metodo_pago: 'EFECTIVO',
      items: datos.items,
      fecha_registro: new Date().toISOString(),
      estado: 'REGISTRADO_LOCAL'
    };

    return from(new Promise<string>(async (resolve, reject) => {
      try {
        const db = this.db || await this.openDatabase();
        const tx = db.transaction(['ventas_offline', 'catalogo'], 'readwrite');
        
        // 1. Guardar la venta offline
        tx.objectStore('ventas_offline').put(venta);

        // 2. Rebajar inmediatamente el stock local de las prendas
        const catStore = tx.objectStore('catalogo');
        datos.items.forEach(item => {
          const getReq = catStore.get(item.variante_id);
          getReq.onsuccess = () => {
            const prenda = getReq.result;
            if (prenda) {
              prenda.stock_disponible = Math.max(0, prenda.stock_disponible - item.cantidad);
              catStore.put(prenda);
            }
          };
        });

        tx.oncomplete = () => {
          this.actualizarConteoPendientes();
          resolve(uuid);
        };
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    }));
  }

  public obtenerVentasOffline(): Observable<VentaContadoLocal[]> {
    return from(new Promise<VentaContadoLocal[]>(async (resolve, reject) => {
      try {
        const db = this.db || await this.openDatabase();
        const tx = db.transaction('ventas_offline', 'readonly');
        const req = tx.objectStore('ventas_offline').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve([]);
      }
    }));
  }

  // ====================================================
  // CU16: Sincronizar Operaciones Comerciales Offline (Batch)
  // ====================================================
  public sincronizarLoteOffline(): Observable<SincronizacionBatchResponse> {
    if (!this.isOnline()) {
      return of({
        total_recibidos: 0,
        procesados_exitosamente: 0,
        duplicados_idempotentes: 0,
        conflictos_stock: 0,
        errores: 0,
        resultados: [{
          uuid_operacion: 'offline',
          tipo_operacion: 'SISTEMA',
          estado: 'OFFLINE',
          mensaje: 'Sin conexión a Internet. Operaciones retenidas en cola local.'
        }]
      });
    }

    return from(this.construirLoteParaSincronizacion()).pipe(
      switchMap(lote => {
        if (!lote || lote.length === 0) {
          return of({
            total_recibidos: 0,
            procesados_exitosamente: 0,
            duplicados_idempotentes: 0,
            conflictos_stock: 0,
            errores: 0,
            resultados: []
          });
        }

        return this.http.post<SincronizacionBatchResponse>(`${this.apiUrl}/sincronizacion/offline`, { lote }).pipe(
          tap(response => {
            // Limpiar de IndexedDB las operaciones confirmadas o duplicadas
            const exitosos = response.resultados
              .filter(r => r.estado === 'SINCRONIZADO' || r.estado === 'DUPLICADO_IDEMPOTENTE')
              .map(r => r.uuid_operacion);
            
            if (exitosos.length > 0) {
              this.eliminarOperacionesSincronizadas(exitosos);
            }
          }),
          catchError(err => {
            console.error('Error al sincronizar lote offline:', err);
            return of({
              total_recibidos: lote.length,
              procesados_exitosamente: 0,
              duplicados_idempotentes: 0,
              conflictos_stock: 0,
              errores: lote.length,
              resultados: [{
                uuid_operacion: 'batch',
                tipo_operacion: 'BATCH',
                estado: 'ERROR',
                mensaje: err.message || 'Error de comunicación con el servidor central.'
              }]
            });
          })
        );
      })
    );
  }

  private async construirLoteParaSincronizacion(): Promise<any[]> {
    const db = this.db || await this.openDatabase();
    const ventas = await new Promise<VentaContadoLocal[]>((resolve) => {
      const tx = db.transaction('ventas_offline', 'readonly');
      const req = tx.objectStore('ventas_offline').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const reservas = await new Promise<ReservaProbadorLocal[]>((resolve) => {
      const tx = db.transaction('reservas_offline', 'readonly');
      const req = tx.objectStore('reservas_offline').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const lote: any[] = [];

    ventas.forEach(v => {
      lote.push({
        uuid_operacion: v.uuid,
        tipo_operacion: 'VENTA_LOCAL',
        fecha_registro_local: v.fecha_registro,
        payload_json: {
          sucursal_id: 1,
          cliente_nombre: 'Cliente Presencial (Offline)',
          monto_total: v.monto_total,
          items: v.items.map(it => ({
            variante_id: it.variante_id,
            cantidad: it.cantidad,
            precio: it.precio
          }))
        }
      });
    });

    reservas.forEach(r => {
      lote.push({
        uuid_operacion: r.uuid,
        tipo_operacion: 'RESERVA_LOCAL',
        fecha_registro_local: r.fecha_creacion,
        payload_json: {
          sucursal_id: 1,
          prenda_id: r.prenda_id,
          hora_ensayo: r.hora_ensayo
        }
      });
    });

    return lote;
  }

  private async eliminarOperacionesSincronizadas(uuids: string[]): Promise<void> {
    if (!this.db || uuids.length === 0) return;
    try {
      const tx = this.db.transaction(['ventas_offline', 'reservas_offline'], 'readwrite');
      const vStore = tx.objectStore('ventas_offline');
      const rStore = tx.objectStore('reservas_offline');

      uuids.forEach(u => {
        vStore.delete(u);
        rStore.delete(u);
      });

      tx.oncomplete = () => {
        this.actualizarConteoPendientes();
      };
    } catch (e) {
      console.warn('Error al limpiar IndexedDB tras sincronización:', e);
    }
  }

  public async actualizarConteoPendientes(): Promise<number> {
    try {
      const db = this.db || await this.openDatabase();
      const countVentas = await new Promise<number>((res) => {
        const tx = db.transaction('ventas_offline', 'readonly');
        const req = tx.objectStore('ventas_offline').count();
        req.onsuccess = () => res(req.result || 0);
        req.onerror = () => res(0);
      });

      const countReservas = await new Promise<number>((res) => {
        const tx = db.transaction('reservas_offline', 'readonly');
        const req = tx.objectStore('reservas_offline').count();
        req.onsuccess = () => res(req.result || 0);
        req.onerror = () => res(0);
      });

      const total = countVentas + countReservas;
      this.pendingCount$.next(total);
      return total;
    } catch {
      return 0;
    }
  }
}
