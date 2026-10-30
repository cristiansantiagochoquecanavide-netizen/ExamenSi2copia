/**
 * FashionStore - Angular IndexedDB Offline Storage & Sync Service
 * Presentación 2: PWA Offline-First para INF412
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

export interface LocalCatalogoItem {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  talla: string;
  color: string;
  stock_disponible: number;
  pecho_cm?: number;
  cintura_cm?: number;
  cadera_cm?: number;
  largo_cm?: number;
  imagen_url?: string;
}

export interface OfflineSyncItem {
  uuid_operacion: string;
  tipo_operacion: 'VENTA_LOCAL' | 'RESERVA_LOCAL' | 'CAMBIO_PRENDA_LOCAL';
  fecha_registro_local: string;
  payload_json: any;
  estado?: 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';
  reintentos?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private readonly DB_NAME = 'FashionStoreLocalDB';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;

  public isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  public pendingSyncCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {
    this.initDatabase().then(() => {
      this.updatePendingCount();
    });
    this.initNetworkListeners();
  }

  private initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('catalogo')) {
          const catStore = db.createObjectStore('catalogo', { keyPath: 'id' });
          catStore.createIndex('categoria', 'categoria', { unique: false });
          catStore.createIndex('talla', 'talla', { unique: false });
        }

        if (!db.objectStoreNames.contains('ventas_offline')) {
          db.createObjectStore('ventas_offline', { keyPath: 'uuid_operacion' });
        }

        if (!db.objectStoreNames.contains('reservas_offline')) {
          db.createObjectStore('reservas_offline', { keyPath: 'uuid_operacion' });
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'uuid_operacion' });
          syncStore.createIndex('tipo_operacion', 'tipo_operacion', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.error('Error al abrir IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  private initNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      this.sincronizarPendientes().subscribe();
    });

    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
    });
  }

  /**
   * Guarda o actualiza el catálogo completo descargado desde el servidor
   */
  public guardarCatalogoLocal(items: LocalCatalogoItem[]): Observable<boolean> {
    return from(
      new Promise<boolean>((resolve, reject) => {
        if (!this.db) return reject('BD no inicializada');
        const tx = this.db.transaction('catalogo', 'readwrite');
        const store = tx.objectStore('catalogo');
        store.clear();

        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      })
    );
  }

  /**
   * Busca productos en el catálogo local de IndexedDB
   */
  public buscarCatalogoLocal(filtro?: string): Observable<LocalCatalogoItem[]> {
    return from(
      new Promise<LocalCatalogoItem[]>((resolve, reject) => {
        if (!this.db) return resolve([]);
        const tx = this.db.transaction('catalogo', 'readonly');
        const store = tx.objectStore('catalogo');
        const req = store.getAll();

        req.onsuccess = () => {
          let results: LocalCatalogoItem[] = req.result || [];
          if (filtro && filtro.trim().length > 0) {
            const query = filtro.toLowerCase();
            results = results.filter(
              i => i.nombre.toLowerCase().includes(query) || i.categoria.toLowerCase().includes(query)
            );
          }
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      })
    );
  }

  /**
   * Registra una venta en efectivo fuera de línea
   */
  public registrarVentaOffline(datosVenta: {
    sucursal_id: number;
    cliente_id: number;
    monto_total: number;
    items: Array<{ producto_variante_id: number; cantidad: number; precio_unitario: number }>;
  }): Observable<string> {
    const uuid = crypto.randomUUID();
    const itemSync: OfflineSyncItem = {
      uuid_operacion: uuid,
      tipo_operacion: 'VENTA_LOCAL',
      fecha_registro_local: new Date().toISOString(),
      payload_json: { ...datosVenta, metodo_pago: 'EFECTIVO' },
      estado: 'PENDIENTE',
      reintentos: 0
    };

    return from(
      new Promise<string>((resolve, reject) => {
        if (!this.db) return reject('BD no disponible');
        const tx = this.db.transaction(['ventas_offline', 'sync_queue'], 'readwrite');
        tx.objectStore('ventas_offline').put(itemSync);
        tx.objectStore('sync_queue').put(itemSync);

        tx.oncomplete = () => {
          this.updatePendingCount();
          // Si estamos online, intentar sincronizar de inmediato
          if (navigator.onLine) {
            this.sincronizarPendientes().subscribe();
          }
          resolve(uuid);
        };
        tx.onerror = () => reject(tx.error);
      })
    );
  }

  /**
   * Registra una reserva para probador físico en tienda sin pago previo
   */
  public registrarReservaOffline(datosReserva: {
    sucursal_id: number;
    cliente_id: number;
    hora_ensayo: string;
    items: Array<{ producto_variante_id: number }>;
  }): Observable<string> {
    const uuid = crypto.randomUUID();
    const itemSync: OfflineSyncItem = {
      uuid_operacion: uuid,
      tipo_operacion: 'RESERVA_LOCAL',
      fecha_registro_local: new Date().toISOString(),
      payload_json: datosReserva,
      estado: 'PENDIENTE',
      reintentos: 0
    };

    return from(
      new Promise<string>((resolve, reject) => {
        if (!this.db) return reject('BD no disponible');
        const tx = this.db.transaction(['reservas_offline', 'sync_queue'], 'readwrite');
        tx.objectStore('reservas_offline').put(itemSync);
        tx.objectStore('sync_queue').put(itemSync);

        tx.oncomplete = () => {
          this.updatePendingCount();
          if (navigator.onLine) {
            this.sincronizarPendientes().subscribe();
          }
          resolve(uuid);
        };
        tx.onerror = () => reject(tx.error);
      })
    );
  }

  /**
   * Envía las operaciones acumuladas en sync_queue al backend
   */
  public sincronizarPendientes(): Observable<any> {
    if (!navigator.onLine) return of(null);

    return from(this.obtenerColaSincronizacion()).pipe(
      switchMap((cola: OfflineSyncItem[]) => {
        if (!cola || cola.length === 0) return of(null);

        const payload = { lote: cola };
        return this.http.post<any>('/api/v1/sincronizacion/offline', payload).pipe(
          tap((res) => {
            // Eliminar de sync_queue los confirmados
            this.limpiarColaConfirmados(cola.map(c => c.uuid_operacion));
          }),
          catchError(err => {
            console.error('Error al sincronizar con el servidor central:', err);
            return of(null);
          })
        );
      })
    );
  }

  private obtenerColaSincronizacion(): Promise<OfflineSyncItem[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction('sync_queue', 'readonly');
      const req = tx.objectStore('sync_queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  private limpiarColaConfirmados(uuids: string[]): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db || uuids.length === 0) return resolve();
      const tx = this.db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      uuids.forEach(u => store.delete(u));
      tx.oncomplete = () => {
        this.updatePendingCount();
        resolve();
      };
    });
  }

  private updatePendingCount(): void {
    if (!this.db) return;
    const tx = this.db.transaction('sync_queue', 'readonly');
    const req = tx.objectStore('sync_queue').count();
    req.onsuccess = () => this.pendingSyncCount$.next(req.result);
  }
}
