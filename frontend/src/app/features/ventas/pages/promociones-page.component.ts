import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../services/ventas.service';
import { Promocion, PromocionCreate, ValidarCuponResponse } from '../models/ventas.models';

@Component({
  selector: 'app-promociones-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-stone-950 text-stone-100 p-6 sm:p-10">
      <div class="max-w-7xl mx-auto space-y-8">
        
        <!-- HEADER -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-800 pb-6 gap-4">
          <div>
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 text-xs font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                CU16 &bull; Marketing &amp; Fidelizacion
              </span>
              <span class="text-xs text-stone-500 tracking-widest font-mono">ATELIER NOIR CRM</span>
            </div>
            <h1 class="text-3xl font-light tracking-wide text-white mt-2 font-serif">
              Promociones &amp; Cupones de Descuento
            </h1>
            <p class="text-sm text-stone-400 mt-1">
              Configura campanas comerciales, cupones de descuento y valida reglas comerciales en tiempo real.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button 
              (click)="activeTab = 'campanas'"
              [class.bg-amber-500]="activeTab === 'campanas'"
              [class.text-stone-950]="activeTab === 'campanas'"
              [class.bg-stone-900]="activeTab !== 'campanas'"
              [class.text-stone-300]="activeTab !== 'campanas'"
              class="px-4 py-2 text-xs font-medium uppercase tracking-wider rounded border border-stone-700 transition hover:border-amber-500/50">
              Campanas y Cupones
            </button>
            <button 
              (click)="activeTab = 'simulador'"
              [class.bg-amber-500]="activeTab === 'simulador'"
              [class.text-stone-950]="activeTab === 'simulador'"
              [class.bg-stone-900]="activeTab !== 'simulador'"
              [class.text-stone-300]="activeTab !== 'simulador'"
              class="px-4 py-2 text-xs font-medium uppercase tracking-wider rounded border border-stone-700 transition hover:border-amber-500/50 flex items-center gap-1.5">
              <span>&#9889;</span> Simulador de Canje
            </button>
            <button 
              *ngIf="activeTab === 'campanas'"
              (click)="abrirModalNuevaPromo()"
              class="px-4 py-2 text-xs font-medium uppercase tracking-wider bg-white text-stone-950 rounded hover:bg-stone-200 transition shadow-lg shadow-white/5 flex items-center gap-2">
              <span>+</span> Nueva Campana
            </button>
          </div>
        </div>

        <!-- NOTIFICACIONES FLASH -->
        <div *ngIf="mensajeExito" class="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>&#10003;</span>
            <span>{{ mensajeExito }}</span>
          </div>
          <button (click)="mensajeExito = null" class="text-stone-400 hover:text-white">&times;</button>
        </div>

        <div *ngIf="errorGeneral" class="bg-rose-950/40 border border-rose-500/30 text-rose-300 px-4 py-3 rounded text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>&#9888;</span>
            <span>{{ errorGeneral }}</span>
          </div>
          <button (click)="errorGeneral = null" class="text-stone-400 hover:text-white">&times;</button>
        </div>

        <!-- ================= TAB 1: CAMPANAS Y CUPONES ================= -->
        <div *ngIf="activeTab === 'campanas'" class="space-y-6">
          
          <!-- KPI METRICS -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-stone-900/60 border border-stone-800 p-5 rounded-lg">
              <span class="text-xs uppercase tracking-widest text-stone-400 font-mono">Total Campanas</span>
              <p class="text-3xl font-light text-white mt-2">{{ promociones.length }}</p>
              <span class="text-xs text-stone-500 mt-1 block">Estrategias creadas</span>
            </div>
            <div class="bg-stone-900/60 border border-stone-800 p-5 rounded-lg">
              <span class="text-xs uppercase tracking-widest text-emerald-400 font-mono">Cupones Activos</span>
              <p class="text-3xl font-light text-emerald-400 mt-2">{{ totalActivas }}</p>
              <span class="text-xs text-stone-500 mt-1 block">Listos para redimir</span>
            </div>
            <div class="bg-stone-900/60 border border-stone-800 p-5 rounded-lg">
              <span class="text-xs uppercase tracking-widest text-amber-400 font-mono">Canjes Registrados</span>
              <p class="text-3xl font-light text-amber-400 mt-2">{{ totalUsos }}</p>
              <span class="text-xs text-stone-500 mt-1 block">En POS y E-Commerce</span>
            </div>
            <div class="bg-stone-900/60 border border-stone-800 p-5 rounded-lg">
              <span class="text-xs uppercase tracking-widest text-stone-400 font-mono">Ahorro Bonificado</span>
              <p class="text-3xl font-light text-white mt-2"><span class="text-amber-400">$</span>{{ totalAhorroEstimado | number:'1.2-2' }}</p>
              <span class="text-xs text-stone-500 mt-1 block">Beneficio acumulado</span>
            </div>
          </div>

          <!-- FILTROS & BUSQUEDA -->
          <div class="flex flex-col sm:flex-row gap-4 justify-between items-center bg-stone-900/40 p-4 rounded-lg border border-stone-800/80">
            <div class="relative w-full sm:w-80">
              <input 
                type="text" 
                [(ngModel)]="filtroTexto" 
                placeholder="Buscar codigo o nombre..." 
                class="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs px-3.5 py-2.5 rounded focus:border-amber-500 focus:outline-none placeholder-stone-600">
            </div>

            <div class="flex items-center gap-3 w-full sm:w-auto">
              <select 
                [(ngModel)]="filtroTipo" 
                class="bg-stone-950 border border-stone-700 text-stone-300 text-xs px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
                <option value="TODOS">Todos los tipos</option>
                <option value="PORCENTAJE">Porcentaje (%)</option>
                <option value="MONTO_FIJO">Monto Fijo ($)</option>
                <option value="ENVIO_GRATIS">Envio Gratis</option>
              </select>

              <select 
                [(ngModel)]="filtroEstado" 
                class="bg-stone-950 border border-stone-700 text-stone-300 text-xs px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVOS">Solo Activos</option>
                <option value="INACTIVOS">Solo Inactivos</option>
              </select>

              <button 
                (click)="cargarPromociones()" 
                title="Recargar"
                class="p-2 text-stone-400 hover:text-white bg-stone-950 border border-stone-700 rounded transition">
                &#8635;
              </button>
            </div>
          </div>

          <!-- TABLA DE PROMOCIONES -->
          <div class="bg-stone-900/30 border border-stone-800 rounded-lg overflow-hidden">
            <div *ngIf="cargando" class="py-12 text-center text-stone-500 text-sm">
              Cargando catalogo de promociones...
            </div>

            <div *ngIf="!cargando && promocionesFiltradas.length === 0" class="py-12 text-center text-stone-500 text-sm">
              No se encontraron promociones que coincidan con los filtros.
            </div>

            <div *ngIf="!cargando && promocionesFiltradas.length > 0" class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-stone-800 text-stone-400 uppercase tracking-widest bg-stone-900/60 font-mono text-[11px]">
                    <th class="py-3 px-4">Codigo</th>
                    <th class="py-3 px-4">Campana / Descripcion</th>
                    <th class="py-3 px-4">Beneficio</th>
                    <th class="py-3 px-4">Reglas Min/Max</th>
                    <th class="py-3 px-4 text-center">Usos / Limite</th>
                    <th class="py-3 px-4">Vigencia</th>
                    <th class="py-3 px-4 text-center">Estado</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-800/60 text-stone-300">
                  <tr *ngFor="let p of promocionesFiltradas" class="hover:bg-stone-900/40 transition">
                    <!-- Codigo -->
                    <td class="py-3.5 px-4 font-mono font-semibold text-amber-400">
                      <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300">
                          {{ p.codigo }}
                        </span>
                        <button (click)="copiarCodigo(p.codigo)" title="Copiar codigo" class="text-stone-500 hover:text-amber-300 text-xs">
                          &#128203;
                        </button>
                      </div>
                    </td>

                    <!-- Campana -->
                    <td class="py-3.5 px-4">
                      <div class="font-medium text-white">{{ p.nombre }}</div>
                      <div class="text-stone-500 text-[11px] truncate max-w-xs">{{ p.descripcion || 'Sin descripcion detallada' }}</div>
                    </td>

                    <!-- Beneficio -->
                    <td class="py-3.5 px-4">
                      <span *ngIf="p.tipo_descuento === 'PORCENTAJE'" class="font-semibold text-emerald-400">
                        {{ p.valor_descuento }}% OFF
                      </span>
                      <span *ngIf="p.tipo_descuento === 'MONTO_FIJO'" class="font-semibold text-sky-400">
                        <span class="text-stone-400">$</span>{{ p.valor_descuento | number:'1.2-2' }} USD
                      </span>
                      <span *ngIf="p.tipo_descuento === 'ENVIO_GRATIS'" class="font-semibold text-purple-400 flex items-center gap-1">
                        <span>&#128666;</span> Envio Bonificado
                      </span>
                    </td>

                    <!-- Reglas -->
                    <td class="py-3.5 px-4 text-[11px] text-stone-400 space-y-0.5">
                      <div>Min: <span class="text-stone-200"><span class="currency">$</span>{{ p.monto_minimo_compra | number:'1.2-2' }}</span></div>
                      <div *ngIf="p.descuento_maximo">Tope: <span class="text-stone-200"><span class="currency">$</span>{{ p.descuento_maximo | number:'1.2-2' }}</span></div>
                      <div>Lim/cliente: <span class="text-stone-200">{{ p.limite_por_cliente }} uso(s)</span></div>
                    </td>

                    <!-- Usos / Limite -->
                    <td class="py-3.5 px-4 text-center">
                      <div class="font-mono text-xs">
                        <span class="text-white font-semibold">{{ p.usos_actuales }}</span>
                        <span class="text-stone-500"> / {{ p.limite_usos ? p.limite_usos : '&#8734;' }}</span>
                      </div>
                      <div *ngIf="p.limite_usos" class="w-20 bg-stone-800 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                        <div 
                          class="bg-amber-400 h-full" 
                          [style.width.%]="(p.usos_actuales / p.limite_usos) * 100">
                        </div>
                      </div>
                    </td>

                    <!-- Vigencia -->
                    <td class="py-3.5 px-4 text-[11px] text-stone-400">
                      <div>{{ p.fecha_inicio | date:'dd/MM/yyyy' }}</div>
                      <div class="text-stone-500">hasta {{ p.fecha_fin | date:'dd/MM/yyyy' }}</div>
                    </td>

                    <!-- Estado Toggle -->
                    <td class="py-3.5 px-4 text-center">
                      <button 
                        (click)="alternarEstado(p)" 
                        [ngClass]="p.activo ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-stone-800 text-stone-500 border-stone-700'"
                        class="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-full border transition hover:opacity-80">
                        {{ p.activo ? 'ACTIVO' : 'INACTIVO' }}
                      </button>
                    </td>

                    <!-- Acciones -->
                    <td class="py-3.5 px-4 text-right space-x-2">
                      <button 
                        (click)="probarEnSimulador(p.codigo)" 
                        title="Probar en simulador" 
                        class="text-amber-400 hover:text-amber-300 text-xs px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                        &#9889; Probar
                      </button>
                      <button 
                        (click)="eliminarPromo(p)" 
                        title="Eliminar o archivar" 
                        class="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded">
                        &#10005;
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ================= TAB 2: SIMULADOR DE CANJE EN VIVO ================= -->
        <div *ngIf="activeTab === 'simulador'" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- PANEL DE CONFIGURACION DE SIMULACION -->
          <div class="lg:col-span-5 bg-stone-900/40 border border-stone-800 p-6 rounded-lg space-y-6">
            <div>
              <span class="text-xs uppercase tracking-widest text-amber-400 font-mono">Motor de Validacion</span>
              <h2 class="text-xl font-light text-white mt-1">Simular Canje de Cupon</h2>
              <p class="text-xs text-stone-400 mt-1">
                Comprueba las reglas de negocio (monto minimo, tope, vigencia, modalidad) antes de aplicar un descuento.
              </p>
            </div>

            <!-- Botones de Cupones Rapidos -->
            <div>
              <label class="block text-xs uppercase tracking-wider text-stone-400 mb-2 font-mono">Cupones de prueba rapida</label>
              <div class="flex flex-wrap gap-2">
                <button 
                  *ngFor="let c of cuponesSugeridos" 
                  (click)="simuladorCodigo = c"
                  class="px-2.5 py-1 text-xs font-mono bg-stone-950 border border-stone-700 text-amber-300 rounded hover:border-amber-400 transition">
                  {{ c }}
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs uppercase tracking-wider text-stone-400 mb-1 font-mono">Codigo del Cupon</label>
                <input 
                  type="text" 
                  [(ngModel)]="simuladorCodigo" 
                  placeholder="Ej. ATELIER20" 
                  class="w-full bg-stone-950 border border-stone-700 text-amber-400 font-mono text-sm px-3.5 py-2.5 rounded focus:border-amber-500 focus:outline-none uppercase">
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs uppercase tracking-wider text-stone-400 font-mono">Subtotal del Carrito ($ USD)</label>
                  <span class="text-xs text-white font-mono"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }}</span>
                </div>
                <input 
                  type="number" 
                  [(ngModel)]="simuladorSubtotal" 
                  min="0" 
                  step="10"
                  class="w-full bg-stone-950 border border-stone-700 text-white text-sm px-3.5 py-2 rounded focus:border-amber-500 focus:outline-none">
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs uppercase tracking-wider text-stone-400 font-mono">Costo de Envio Base ($ USD)</label>
                  <span class="text-xs text-white font-mono"><span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }}</span>
                </div>
                <input 
                  type="number" 
                  [(ngModel)]="simuladorCostoEnvio" 
                  min="0" 
                  step="1"
                  class="w-full bg-stone-950 border border-stone-700 text-white text-sm px-3.5 py-2 rounded focus:border-amber-500 focus:outline-none">
              </div>

              <button 
                (click)="ejecutarSimulacion()" 
                [disabled]="simulando || !simuladorCodigo.trim()"
                class="w-full py-3 bg-amber-500 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded hover:bg-amber-400 transition shadow-lg shadow-amber-500/10 disabled:opacity-50 flex items-center justify-center gap-2">
                <span *ngIf="simulando">Validando con Motor Comercial...</span>
                <span *ngIf="!simulando">&#9889; Validar &amp; Calcular Descuento</span>
              </button>
            </div>
          </div>

          <!-- PANEL DE RESULTADO EN VIVO -->
          <div class="lg:col-span-7 bg-stone-900/40 border border-stone-800 p-6 rounded-lg flex flex-col justify-between space-y-6">
            <div>
              <span class="text-xs uppercase tracking-widest text-stone-500 font-mono">Resultado de la Auditoria</span>
              <h2 class="text-xl font-light text-white mt-1">Desglose Financiero</h2>
            </div>

            <!-- Estado sin simulacion -->
            <div *ngIf="!resultadoSimulacion" class="py-16 text-center text-stone-500 text-sm border border-dashed border-stone-800 rounded">
              Ingresa un codigo y un subtotal para simular la liquidacion en tiempo real.
            </div>

            <!-- Resultado Exitoso -->
            <div *ngIf="resultadoSimulacion && resultadoSimulacion.valido" class="space-y-6">
              <div class="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-lg flex items-center gap-3">
                <span class="text-2xl">&#127881;</span>
                <div>
                  <div class="text-emerald-400 font-medium text-sm">{{ resultadoSimulacion.mensaje }}</div>
                  <div class="text-xs text-stone-400 mt-0.5">Cupon verificado con exito bajo las politicas comerciales de la boutique.</div>
                </div>
              </div>

              <div class="bg-stone-950 p-5 rounded-lg border border-stone-800 space-y-3 font-mono text-xs">
                <div class="flex justify-between text-stone-400">
                  <span>Subtotal prendas:</span>
                  <span class="text-white"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }} USD</span>
                </div>
                <div class="flex justify-between text-emerald-400 font-semibold">
                  <span>Descuento cupon ({{ resultadoSimulacion.codigo }}):</span>
                  <span>- <span class="currency">$</span>{{ resultadoSimulacion.descuento_calculado | number:'1.2-2' }} USD</span>
                </div>
                <div class="flex justify-between text-stone-400">
                  <span>Costo de envio despacho:</span>
                  <span [class.line-through]="resultadoSimulacion.tipo_descuento === 'ENVIO_GRATIS'">
                    <span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }} USD
                  </span>
                </div>
                <div *ngIf="resultadoSimulacion.tipo_descuento === 'ENVIO_GRATIS'" class="flex justify-between text-purple-400">
                  <span>Bonificacion Yaigo Express:</span>
                  <span>Gratis ($0.00)</span>
                </div>
                <div class="border-t border-stone-800 pt-3 flex justify-between text-sm text-white font-bold">
                  <span>TOTAL FINAL A COBRAR:</span>
                  <span class="text-amber-400"><span class="currency">$</span>{{ resultadoSimulacion.total_con_descuento | number:'1.2-2' }} USD</span>
                </div>
              </div>

              <div *ngIf="resultadoSimulacion.promocion" class="bg-stone-900/80 p-4 rounded border border-stone-800 text-xs space-y-1">
                <div class="text-stone-400 font-mono text-[11px] uppercase">Detalle de Reglas Activas:</div>
                <div class="text-stone-300">Campana: <strong class="text-white">{{ resultadoSimulacion.promocion.nombre }}</strong></div>
                <div class="text-stone-400">Monto minimo exigido: <span class="currency">$</span>{{ resultadoSimulacion.promocion.monto_minimo_compra | number:'1.2-2' }} USD</div>
                <div *ngIf="resultadoSimulacion.promocion.descuento_maximo" class="text-stone-400">
                  Tope maximo de descuento: <span class="currency">$</span>{{ resultadoSimulacion.promocion.descuento_maximo | number:'1.2-2' }} USD
                </div>
              </div>
            </div>

            <!-- Resultado Invalido -->
            <div *ngIf="resultadoSimulacion && !resultadoSimulacion.valido" class="space-y-6">
              <div class="bg-rose-950/40 border border-rose-500/40 p-4 rounded-lg flex items-center gap-3">
                <span class="text-2xl">&#128683;</span>
                <div>
                  <div class="text-rose-400 font-medium text-sm">Cupon Rechazado por el Motor</div>
                  <div class="text-xs text-rose-300/80 mt-0.5">{{ resultadoSimulacion.mensaje }}</div>
                </div>
              </div>

              <div class="bg-stone-950 p-5 rounded-lg border border-stone-800 space-y-3 font-mono text-xs opacity-70">
                <div class="flex justify-between text-stone-400">
                  <span>Subtotal prendas:</span>
                  <span class="text-white"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }} USD</span>
                </div>
                <div class="flex justify-between text-stone-500">
                  <span>Descuento aplicado:</span>
                  <span>$0.00 USD</span>
                </div>
                <div class="flex justify-between text-stone-400">
                  <span>Costo de envio:</span>
                  <span><span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }} USD</span>
                </div>
                <div class="border-t border-stone-800 pt-3 flex justify-between text-sm text-white font-bold">
                  <span>TOTAL SIN DESCUENTO:</span>
                  <span class="text-white"><span class="currency">$</span>{{ (simuladorSubtotal + simuladorCostoEnvio) | number:'1.2-2' }} USD</span>
                </div>
              </div>
            </div>

            <div class="text-stone-600 text-[11px] font-mono border-t border-stone-800 pt-4 flex justify-between">
              <span>MOTOR: CU16 PromoEngine v2.4</span>
              <span>ATELIER NOIR VALIDATOR</span>
            </div>
          </div>

        </div>

      </div>

      <!-- ================= MODAL NUEVA CAMPANA / CUPON ================= -->
      <div *ngIf="modalNuevaPromo" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-stone-900 border border-stone-800 rounded-lg max-w-2xl w-full p-6 space-y-5 my-8 shadow-2xl">
          
          <div class="flex justify-between items-start border-b border-stone-800 pb-4">
            <div>
              <span class="text-xs uppercase tracking-widest text-amber-400 font-mono">Alta Comercial</span>
              <h3 class="text-xl font-light text-white mt-1">Crear Nueva Campana / Cupon</h3>
            </div>
            <button (click)="modalNuevaPromo = false" class="text-stone-400 hover:text-white text-xl">&times;</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            <!-- Codigo -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Codigo de Cupon *</label>
              <input 
                type="text" 
                [(ngModel)]="nuevaPromo.codigo" 
                placeholder="Ej. VERANO25" 
                class="w-full bg-stone-950 border border-stone-700 text-amber-400 font-mono px-3 py-2 rounded focus:border-amber-500 focus:outline-none uppercase">
            </div>

            <!-- Nombre -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Nombre de Campana *</label>
              <input 
                type="text" 
                [(ngModel)]="nuevaPromo.nombre" 
                placeholder="Ej. Descuento Temporada Verano" 
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

            <!-- Descripcion -->
            <div class="sm:col-span-2">
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Descripcion Comercial</label>
              <input 
                type="text" 
                [(ngModel)]="nuevaPromo.descripcion" 
                placeholder="Ej. Valido en vestidos y trajes seleccionados" 
                class="w-full bg-stone-950 border border-stone-700 text-stone-300 px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

            <!-- Tipo de Descuento -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Tipo de Descuento *</label>
              <select 
                [(ngModel)]="nuevaPromo.tipo_descuento" 
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
                <option value="PORCENTAJE">Porcentaje (%)</option>
                <option value="MONTO_FIJO">Monto Fijo ($ USD)</option>
                <option value="ENVIO_GRATIS">Envio Gratis</option>
              </select>
            </div>

            <!-- Valor de Descuento -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">
                Valor Beneficio {{ nuevaPromo.tipo_descuento === 'PORCENTAJE' ? '(%)' : '($ USD)' }} *
              </label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.valor_descuento" 
                min="0"
                step="5"
                [disabled]="nuevaPromo.tipo_descuento === 'ENVIO_GRATIS'"
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none disabled:opacity-40">
            </div>

            <!-- Monto Minimo Compra -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Monto Minimo Compra ($ USD)</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.monto_minimo_compra" 
                min="0"
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

            <!-- Descuento Maximo (Tope) -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Tope Max. Descuento ($ USD)</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.descuento_maximo" 
                min="0"
                placeholder="Opcional (sin limite)"
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

            <!-- Limite Global de Usos -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Limite Global de Canjes</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.limite_usos" 
                min="1"
                placeholder="Opcional (ilimitado)"
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

            <!-- Limite por Cliente -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Limite por Cliente</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.limite_por_cliente" 
                min="1"
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

            <!-- Fechas Vigencia -->
            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Fecha Inicio *</label>
              <input 
                type="date" 
                [(ngModel)]="fechaInicioInput" 
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

            <div>
              <label class="block uppercase tracking-wider text-stone-400 mb-1 font-mono">Fecha Fin *</label>
              <input 
                type="date" 
                [(ngModel)]="fechaFinInput" 
                class="w-full bg-stone-950 border border-stone-700 text-white px-3 py-2 rounded focus:border-amber-500 focus:outline-none">
            </div>

          </div>

          <div class="border-t border-stone-800 pt-4 flex justify-end gap-3">
            <button 
              (click)="modalNuevaPromo = false" 
              class="px-4 py-2 bg-stone-800 text-stone-300 text-xs uppercase tracking-wider rounded hover:bg-stone-700 transition">
              Cancelar
            </button>
            <button 
              (click)="guardarNuevaPromo()" 
              [disabled]="guardandoPromo"
              class="px-5 py-2 bg-amber-500 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded hover:bg-amber-400 transition shadow-lg shadow-amber-500/10 disabled:opacity-50">
              {{ guardandoPromo ? 'Guardando...' : 'Crear Promocion' }}
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class PromocionesPageComponent implements OnInit {
  private readonly ventasService = inject(VentasService);

  activeTab: 'campanas' | 'simulador' = 'campanas';
  promociones: Promocion[] = [];
  cargando = false;
  mensajeExito: string | null = null;
  errorGeneral: string | null = null;

  // Filtros
  filtroTexto = '';
  filtroTipo = 'TODOS';
  filtroEstado = 'TODOS';

  // Simulador
  simuladorCodigo = 'ATELIER20';
  simuladorSubtotal = 120;
  simuladorCostoEnvio = 5;
  simulando = false;
  resultadoSimulacion: ValidarCuponResponse | null = null;
  cuponesSugeridos = ['ATELIER20', 'NOIR50', 'ENVIOGRATIS'];

  // Modal Crear
  modalNuevaPromo = false;
  guardandoPromo = false;
  fechaInicioInput = '';
  fechaFinInput = '';
  nuevaPromo: PromocionCreate = {
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_descuento: 'PORCENTAJE',
    valor_descuento: 20,
    monto_minimo_compra: 60,
    descuento_maximo: undefined,
    limite_usos: 150,
    limite_por_cliente: 1,
    fecha_inicio: '',
    fecha_fin: '',
    activo: true
  };

  ngOnInit(): void {
    this.cargarPromociones();
  }

  cargarPromociones(): void {
    this.cargando = true;
    this.errorGeneral = null;
    this.ventasService.getPromociones().subscribe({
      next: (data) => {
        this.promociones = data;
        this.cargando = false;
      },
      error: (err) => {
        this.errorGeneral = 'Error al cargar las promociones: ' + (err.error?.detail || err.message);
        this.cargando = false;
      }
    });
  }

  get totalActivas(): number {
    return this.promociones.filter(p => p.activo).length;
  }

  get totalUsos(): number {
    return this.promociones.reduce((acc, p) => acc + (p.usos_actuales || 0), 0);
  }

  get totalAhorroEstimado(): number {
    return this.promociones.reduce((acc, p) => {
      const usos = p.usos_actuales || 0;
      if (p.tipo_descuento === 'MONTO_FIJO') return acc + (usos * p.valor_descuento);
      if (p.tipo_descuento === 'PORCENTAJE') return acc + (usos * 24.0);
      if (p.tipo_descuento === 'ENVIO_GRATIS') return acc + (usos * 5.0);
      return acc;
    }, 0);
  }

  get promocionesFiltradas(): Promocion[] {
    return this.promociones.filter(p => {
      const matchTexto = !this.filtroTexto.trim() || 
        p.codigo.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        p.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase());
      
      const matchTipo = this.filtroTipo === 'TODOS' || p.tipo_descuento === this.filtroTipo;
      
      const matchEstado = this.filtroEstado === 'TODOS' || 
        (this.filtroEstado === 'ACTIVOS' && p.activo) ||
        (this.filtroEstado === 'INACTIVOS' && !p.activo);

      return matchTexto && matchTipo && matchEstado;
    });
  }

  copiarCodigo(codigo: string): void {
    navigator.clipboard.writeText(codigo);
    this.mensajeExito = 'Codigo ' + codigo + ' copiado al portapapeles.';
    setTimeout(() => this.mensajeExito = null, 3000);
  }

  alternarEstado(p: Promocion): void {
    const nuevoEstado = !p.activo;
    this.ventasService.cambiarEstadoPromocion(p.id, nuevoEstado).subscribe({
      next: (actualizada) => {
        p.activo = actualizada.activo;
        this.mensajeExito = 'Promocion ' + p.codigo + ' ' + (p.activo ? 'activada' : 'desactivada') + ' exitosamente.';
        setTimeout(() => this.mensajeExito = null, 3000);
      },
      error: (err) => {
        this.errorGeneral = 'Error al cambiar estado: ' + (err.error?.detail || err.message);
      }
    });
  }

  eliminarPromo(p: Promocion): void {
    if (!confirm('Deseas eliminar o desactivar la promocion ' + p.codigo + '?')) return;

    this.ventasService.deletePromocion(p.id).subscribe({
      next: (res) => {
        this.mensajeExito = res.mensaje || ('Promocion ' + p.codigo + ' procesada.');
        this.cargarPromociones();
      },
      error: (err) => {
        this.errorGeneral = 'Error al eliminar promocion: ' + (err.error?.detail || err.message);
      }
    });
  }

  probarEnSimulador(codigo: string): void {
    this.simuladorCodigo = codigo;
    this.activeTab = 'simulador';
    this.ejecutarSimulacion();
  }

  ejecutarSimulacion(): void {
    if (!this.simuladorCodigo.trim()) return;

    this.simulando = true;
    this.resultadoSimulacion = null;
    this.ventasService.validarCupon({
      codigo: this.simuladorCodigo.trim(),
      subtotal: this.simuladorSubtotal,
      costo_envio: this.simuladorCostoEnvio
    }).subscribe({
      next: (res) => {
        this.resultadoSimulacion = res;
        this.simulando = false;
      },
      error: (err) => {
        this.resultadoSimulacion = {
          valido: false,
          codigo: this.simuladorCodigo,
          mensaje: err.error?.detail || 'Error de conexion con el motor de validacion',
          descuento_calculado: 0,
          total_con_descuento: this.simuladorSubtotal + this.simuladorCostoEnvio
        };
        this.simulando = false;
      }
    });
  }

  abrirModalNuevaPromo(): void {
    const hoy = new Date();
    const proximoMes = new Date();
    proximoMes.setDate(hoy.getDate() + 30);

    this.fechaInicioInput = hoy.toISOString().split('T')[0];
    this.fechaFinInput = proximoMes.toISOString().split('T')[0];

    this.nuevaPromo = {
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo_descuento: 'PORCENTAJE',
      valor_descuento: 20,
      monto_minimo_compra: 60,
      descuento_maximo: undefined,
      limite_usos: 150,
      limite_por_cliente: 1,
      fecha_inicio: '',
      fecha_fin: '',
      activo: true
    };
    this.modalNuevaPromo = true;
  }

  guardarNuevaPromo(): void {
    if (!this.nuevaPromo.codigo.trim() || !this.nuevaPromo.nombre.trim()) {
      this.errorGeneral = 'El codigo y el nombre de la promocion son obligatorios.';
      return;
    }

    if (!this.fechaInicioInput || !this.fechaFinInput) {
      this.errorGeneral = 'Debes especificar las fechas de inicio y fin.';
      return;
    }

    this.guardandoPromo = true;
    this.nuevaPromo.fecha_inicio = new Date(this.fechaInicioInput + 'T00:00:00Z').toISOString();
    this.nuevaPromo.fecha_fin = new Date(this.fechaFinInput + 'T23:59:59Z').toISOString();

    this.ventasService.createPromocion(this.nuevaPromo).subscribe({
      next: (creada) => {
        this.mensajeExito = 'Promocion ' + creada.codigo + ' creada con exito!';
        this.guardandoPromo = false;
        this.modalNuevaPromo = false;
        this.cargarPromociones();
      },
      error: (err) => {
        this.errorGeneral = 'Error al crear la promocion: ' + (err.error?.detail || err.message);
        this.guardandoPromo = false;
      }
    });
  }
}
