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
    <div class="min-h-screen bg-white text-gray-900 p-6 sm:p-10 font-sans">
      <div class="max-w-7xl mx-auto space-y-8">
        
        <!-- HEADER -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-6 gap-4">
          <div>
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 text-xs font-semibold tracking-wider uppercase bg-gray-100 text-gray-800 border border-gray-200 rounded">
                Marketing &amp; Fidelización
              </span>
              <span class="text-xs text-gray-500 tracking-widest font-mono">ATELIER NOIR CRM</span>
            </div>
            <h1 class="text-3xl font-extrabold tracking-tight text-black mt-2">
              Promociones &amp; Cupones de Descuento
            </h1>
            <p class="text-sm text-gray-500 mt-1">
              Configura campanas comerciales, cupones de descuento y valida reglas comerciales en tiempo real.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button 
              (click)="activeTab = 'campanas'"
              [class.bg-black]="activeTab === 'campanas'"
              [class.text-white]="activeTab === 'campanas'"
              [class.bg-gray-100]="activeTab !== 'campanas'"
              [class.text-gray-700]="activeTab !== 'campanas'"
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded border border-gray-200 transition hover:border-black">
              Campanas y Cupones
            </button>
            <button 
              (click)="activeTab = 'simulador'"
              [class.bg-black]="activeTab === 'simulador'"
              [class.text-white]="activeTab === 'simulador'"
              [class.bg-gray-100]="activeTab !== 'simulador'"
              [class.text-gray-700]="activeTab !== 'simulador'"
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded border border-gray-200 transition hover:border-black flex items-center gap-1.5">
              <span>&#9889;</span> Simulador de Canje
            </button>
            <button 
              *ngIf="activeTab === 'campanas'"
              (click)="abrirModalNuevaPromo()"
              class="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-black text-white rounded hover:bg-neutral-800 transition shadow-sm flex items-center gap-2 border border-black">
              <span>+</span> Nueva Campana
            </button>
          </div>
        </div>

        <!-- NOTIFICACIONES FLASH -->
        <div *ngIf="mensajeExito" class="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>&#10003;</span>
            <span>{{ mensajeExito }}</span>
          </div>
          <button (click)="mensajeExito = null" class="text-gray-400 hover:text-black">&times;</button>
        </div>

        <div *ngIf="errorGeneral" class="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>&#9888;</span>
            <span>{{ errorGeneral }}</span>
          </div>
          <button (click)="errorGeneral = null" class="text-gray-400 hover:text-black">&times;</button>
        </div>

        <!-- ================= TAB 1: CAMPANAS Y CUPONES ================= -->
        <div *ngIf="activeTab === 'campanas'" class="space-y-6">
          
          <!-- KPI METRICS -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white border border-gray-200 p-5 rounded shadow-sm">
              <span class="text-xs uppercase tracking-widest text-gray-500 font-mono">Total Campanas</span>
              <p class="text-3xl font-bold text-black mt-2">{{ promociones.length }}</p>
              <span class="text-xs text-gray-500 mt-1 block">Estrategias creadas</span>
            </div>
            <div class="bg-white border border-gray-200 p-5 rounded shadow-sm">
              <span class="text-xs uppercase tracking-widest text-emerald-700 font-mono">Cupones Activos</span>
              <p class="text-3xl font-bold text-emerald-700 mt-2">{{ totalActivas }}</p>
              <span class="text-xs text-gray-500 mt-1 block">Listos para redimir</span>
            </div>
            <div class="bg-white border border-gray-200 p-5 rounded shadow-sm">
              <span class="text-xs uppercase tracking-widest text-gray-600 font-mono">Canjes Registrados</span>
              <p class="text-3xl font-bold text-black mt-2">{{ totalUsos }}</p>
              <span class="text-xs text-gray-500 mt-1 block">En POS y E-Commerce</span>
            </div>
            <div class="bg-white border border-gray-200 p-5 rounded shadow-sm">
              <span class="text-xs uppercase tracking-widest text-gray-500 font-mono">Ahorro Bonificado</span>
              <p class="text-3xl font-bold text-black mt-2"><span class="text-black">$</span>{{ totalAhorroEstimado | number:'1.2-2' }}</p>
              <span class="text-xs text-gray-500 mt-1 block">Beneficio acumulado</span>
            </div>
          </div>

          <!-- FILTROS & BUSQUEDA -->
          <div class="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 p-4 rounded border border-gray-200">
            <div class="relative w-full sm:w-80">
              <input 
                type="text" 
                [(ngModel)]="filtroTexto" 
                placeholder="Buscar codigo o nombre..." 
                class="w-full bg-white border border-gray-300 text-gray-900 text-xs px-3.5 py-2.5 rounded focus:border-black focus:outline-none placeholder-gray-400">
            </div>

            <div class="flex items-center gap-3 w-full sm:w-auto">
              <select 
                [(ngModel)]="filtroTipo" 
                class="bg-white border border-gray-300 text-gray-800 text-xs px-3 py-2 rounded focus:border-black focus:outline-none">
                <option value="TODOS">Todos los tipos</option>
                <option value="PORCENTAJE">Porcentaje (%)</option>
                <option value="MONTO_FIJO">Monto Fijo ($)</option>
                <option value="ENVIO_GRATIS">Envio Gratis</option>
              </select>

              <select 
                [(ngModel)]="filtroEstado" 
                class="bg-white border border-gray-300 text-gray-800 text-xs px-3 py-2 rounded focus:border-black focus:outline-none">
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVOS">Solo Activos</option>
                <option value="INACTIVOS">Solo Inactivos</option>
              </select>

              <button 
                (click)="cargarPromociones()" 
                title="Recargar"
                class="p-2 text-gray-600 hover:text-black bg-white border border-gray-300 rounded transition">
                &#8635;
              </button>
            </div>
          </div>

          <!-- TABLA DE PROMOCIONES -->
          <div class="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            <div *ngIf="cargando" class="py-12 text-center text-gray-500 text-sm">
              Cargando catalogo de promociones...
            </div>

            <div *ngIf="!cargando && promocionesFiltradas.length === 0" class="py-12 text-center text-gray-500 text-sm">
              No se encontraron promociones que coincidan con los filtros.
            </div>

            <div *ngIf="!cargando && promocionesFiltradas.length > 0" class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-gray-200 text-gray-600 uppercase tracking-widest bg-gray-50 font-mono text-[11px]">
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
                <tbody class="divide-y divide-gray-100 text-gray-800">
                  <tr *ngFor="let p of promocionesFiltradas" class="hover:bg-gray-50 transition">
                    <!-- Codigo -->
                    <td class="py-3.5 px-4 font-mono font-bold text-black">
                      <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-black font-mono">
                          {{ p.codigo }}
                        </span>
                        <button (click)="copiarCodigo(p.codigo)" title="Copiar codigo" class="text-gray-400 hover:text-black text-xs">
                          &#128203;
                        </button>
                      </div>
                    </td>

                    <!-- Campana -->
                    <td class="py-3.5 px-4">
                      <div class="font-semibold text-black">{{ p.nombre }}</div>
                      <div class="text-gray-500 text-[11px] truncate max-w-xs">{{ p.descripcion || 'Sin descripcion detallada' }}</div>
                    </td>

                    <!-- Beneficio -->
                    <td class="py-3.5 px-4">
                      <span *ngIf="p.tipo_descuento === 'PORCENTAJE'" class="font-bold text-emerald-700">
                        {{ p.valor_descuento }}% OFF
                      </span>
                      <span *ngIf="p.tipo_descuento === 'MONTO_FIJO'" class="font-bold text-blue-700">
                        <span class="text-gray-500">$</span>{{ p.valor_descuento | number:'1.2-2' }} USD
                      </span>
                      <span *ngIf="p.tipo_descuento === 'ENVIO_GRATIS'" class="font-bold text-purple-700 flex items-center gap-1">
                        <span>&#128666;</span> Envio Bonificado
                      </span>
                    </td>

                    <!-- Reglas -->
                    <td class="py-3.5 px-4 text-[11px] text-gray-500 space-y-0.5">
                      <div>Min: <span class="text-gray-900 font-medium"><span class="currency">$</span>{{ p.monto_minimo_compra | number:'1.2-2' }}</span></div>
                      <div *ngIf="p.descuento_maximo">Tope: <span class="text-gray-900 font-medium"><span class="currency">$</span>{{ p.descuento_maximo | number:'1.2-2' }}</span></div>
                      <div>Lim/cliente: <span class="text-gray-900 font-medium">{{ p.limite_por_cliente }} uso(s)</span></div>
                    </td>

                    <!-- Usos / Limite -->
                    <td class="py-3.5 px-4 text-center">
                      <div class="font-mono text-xs">
                        <span class="text-black font-semibold">{{ p.usos_actuales }}</span>
                        <span class="text-gray-400"> / {{ p.limite_usos ? p.limite_usos : '&#8734;' }}</span>
                      </div>
                      <div *ngIf="p.limite_usos" class="w-20 bg-gray-200 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                        <div 
                          class="bg-black h-full" 
                          [style.width.%]="(p.usos_actuales / p.limite_usos) * 100">
                        </div>
                      </div>
                    </td>

                    <!-- Vigencia -->
                    <td class="py-3.5 px-4 text-[11px] text-gray-500">
                      <div>{{ p.fecha_inicio | date:'dd/MM/yyyy' }}</div>
                      <div class="text-gray-400">hasta {{ p.fecha_fin | date:'dd/MM/yyyy' }}</div>
                    </td>

                    <!-- Estado Toggle -->
                    <td class="py-3.5 px-4 text-center">
                      <button 
                        (click)="alternarEstado(p)" 
                        [ngClass]="p.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'"
                        class="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full border transition hover:opacity-80">
                        {{ p.activo ? 'ACTIVO' : 'INACTIVO' }}
                      </button>
                    </td>

                    <!-- Acciones -->
                    <td class="py-3.5 px-4 text-right space-x-2">
                      <button 
                        (click)="probarEnSimulador(p.codigo)" 
                        title="Probar en simulador" 
                        class="text-black hover:bg-gray-100 text-xs px-2.5 py-1 bg-white border border-gray-300 rounded font-medium transition">
                        &#9889; Probar
                      </button>
                      <button 
                        (click)="eliminarPromo(p)" 
                        title="Eliminar o archivar" 
                        class="text-rose-600 hover:bg-rose-50 text-xs px-2.5 py-1 bg-white border border-rose-200 rounded font-medium transition">
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
          <div class="lg:col-span-5 bg-white border border-gray-200 p-6 rounded shadow-sm space-y-6">
            <div>
              <span class="text-xs uppercase tracking-widest text-gray-500 font-mono">Motor de Validacion</span>
              <h2 class="text-xl font-bold text-black mt-1">Simular Canje de Cupon</h2>
              <p class="text-xs text-gray-500 mt-1">
                Comprueba las reglas de negocio (monto minimo, tope, vigencia, modalidad) antes de aplicar un descuento.
              </p>
            </div>

            <!-- Botones de Cupones Rapidos -->
            <div>
              <label class="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-mono font-semibold">Cupones de prueba rapida</label>
              <div class="flex flex-wrap gap-2">
                <button 
                  *ngFor="let c of cuponesSugeridos" 
                  (click)="simuladorCodigo = c"
                  class="px-2.5 py-1 text-xs font-mono bg-gray-50 border border-gray-300 text-black rounded hover:border-black font-bold transition">
                  {{ c }}
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Codigo del Cupon</label>
                <input 
                  type="text" 
                  [(ngModel)]="simuladorCodigo" 
                  placeholder="Ej. ATELIER20" 
                  class="w-full bg-white border border-gray-300 text-black font-mono font-bold text-sm px-3.5 py-2.5 rounded focus:border-black focus:outline-none uppercase">
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs uppercase tracking-wider text-gray-600 font-mono font-semibold">Subtotal del Carrito ($ USD)</label>
                  <span class="text-xs text-black font-mono font-bold"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }}</span>
                </div>
                <input 
                  type="number" 
                  [(ngModel)]="simuladorSubtotal" 
                  min="0" 
                  step="10"
                  class="w-full bg-white border border-gray-300 text-gray-900 text-sm px-3.5 py-2 rounded focus:border-black focus:outline-none font-medium">
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs uppercase tracking-wider text-gray-600 font-mono font-semibold">Costo de Envio Base ($ USD)</label>
                  <span class="text-xs text-black font-mono font-bold"><span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }}</span>
                </div>
                <input 
                  type="number" 
                  [(ngModel)]="simuladorCostoEnvio" 
                  min="0" 
                  step="1"
                  class="w-full bg-white border border-gray-300 text-gray-900 text-sm px-3.5 py-2 rounded focus:border-black focus:outline-none font-medium">
              </div>

              <button 
                (click)="ejecutarSimulacion()" 
                [disabled]="simulando || !simuladorCodigo.trim()"
                class="w-full py-3 bg-black text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-neutral-800 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <span *ngIf="simulando">Validando con Motor Comercial...</span>
                <span *ngIf="!simulando">&#9889; Validar &amp; Calcular Descuento</span>
              </button>
            </div>
          </div>

          <!-- PANEL DE RESULTADO EN VIVO -->
          <div class="lg:col-span-7 bg-white border border-gray-200 p-6 rounded shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span class="text-xs uppercase tracking-widest text-gray-500 font-mono">Resultado de la Auditoria</span>
              <h2 class="text-xl font-bold text-black mt-1">Desglose Financiero</h2>
            </div>

            <!-- Estado sin simulacion -->
            <div *ngIf="!resultadoSimulacion" class="py-16 text-center text-gray-500 text-sm border border-dashed border-gray-300 rounded bg-gray-50">
              Ingresa un codigo y un subtotal para simular la liquidacion en tiempo real.
            </div>

            <!-- Resultado Exitoso -->
            <div *ngIf="resultadoSimulacion && resultadoSimulacion.valido" class="space-y-6">
              <div class="bg-emerald-50 border border-emerald-200 p-4 rounded flex items-center gap-3">
                <span class="text-2xl">&#127881;</span>
                <div>
                  <div class="text-emerald-800 font-semibold text-sm">{{ resultadoSimulacion.mensaje }}</div>
                  <div class="text-xs text-emerald-600 mt-0.5">Cupon verificado con exito bajo las politicas comerciales de la boutique.</div>
                </div>
              </div>

              <div class="bg-gray-50 p-5 rounded border border-gray-200 space-y-3 font-mono text-xs">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal prendas:</span>
                  <span class="text-black font-semibold"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }} USD</span>
                </div>
                <div class="flex justify-between text-emerald-700 font-bold">
                  <span>Descuento cupon ({{ resultadoSimulacion.codigo }}):</span>
                  <span>- <span class="currency">$</span>{{ resultadoSimulacion.descuento_calculado | number:'1.2-2' }} USD</span>
                </div>
                <div class="flex justify-between text-gray-600">
                  <span>Costo de envio despacho:</span>
                  <span [class.line-through]="resultadoSimulacion.tipo_descuento === 'ENVIO_GRATIS'">
                    <span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }} USD
                  </span>
                </div>
                <div *ngIf="resultadoSimulacion.tipo_descuento === 'ENVIO_GRATIS'" class="flex justify-between text-purple-700 font-semibold">
                  <span>Bonificacion Yaigo Express:</span>
                  <span>Gratis ($0.00)</span>
                </div>
                <div class="border-t border-gray-200 pt-3 flex justify-between text-sm text-black font-bold">
                  <span>TOTAL FINAL A COBRAR:</span>
                  <span class="text-black text-base font-extrabold"><span class="currency">$</span>{{ resultadoSimulacion.total_con_descuento | number:'1.2-2' }} USD</span>
                </div>
              </div>

              <div *ngIf="resultadoSimulacion.promocion" class="bg-gray-100 p-4 rounded border border-gray-200 text-xs space-y-1">
                <div class="text-gray-500 font-mono text-[11px] uppercase font-semibold">Detalle de Reglas Activas:</div>
                <div class="text-gray-800">Campana: <strong class="text-black">{{ resultadoSimulacion.promocion.nombre }}</strong></div>
                <div class="text-gray-600">Monto minimo exigido: <span class="currency">$</span>{{ resultadoSimulacion.promocion.monto_minimo_compra | number:'1.2-2' }} USD</div>
                <div *ngIf="resultadoSimulacion.promocion.descuento_maximo" class="text-gray-600">
                  Tope maximo de descuento: <span class="currency">$</span>{{ resultadoSimulacion.promocion.descuento_maximo | number:'1.2-2' }} USD
                </div>
              </div>
            </div>

            <!-- Resultado Invalido -->
            <div *ngIf="resultadoSimulacion && !resultadoSimulacion.valido" class="space-y-6">
              <div class="bg-rose-50 border border-rose-200 p-4 rounded flex items-center gap-3">
                <span class="text-2xl">&#128683;</span>
                <div>
                  <div class="text-rose-800 font-semibold text-sm">Cupon Rechazado por el Motor</div>
                  <div class="text-xs text-rose-600 mt-0.5">{{ resultadoSimulacion.mensaje }}</div>
                </div>
              </div>

              <div class="bg-gray-50 p-5 rounded border border-gray-200 space-y-3 font-mono text-xs opacity-80">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal prendas:</span>
                  <span class="text-black font-semibold"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }} USD</span>
                </div>
                <div class="flex justify-between text-gray-500">
                  <span>Descuento aplicado:</span>
                  <span>$0.00 USD</span>
                </div>
                <div class="flex justify-between text-gray-600">
                  <span>Costo de envio:</span>
                  <span><span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }} USD</span>
                </div>
                <div class="border-t border-gray-200 pt-3 flex justify-between text-sm text-black font-bold">
                  <span>TOTAL SIN DESCUENTO:</span>
                  <span class="text-black"><span class="currency">$</span>{{ (simuladorSubtotal + simuladorCostoEnvio) | number:'1.2-2' }} USD</span>
                </div>
              </div>
            </div>

            <div class="text-gray-400 text-[11px] font-mono border-t border-gray-200 pt-4 flex justify-between">
              <span>MOTOR: PromoEngine v2.4</span>
              <span>ATELIER NOIR VALIDATOR</span>
            </div>
          </div>

        </div>

      </div>

      <!-- ================= MODAL NUEVA CAMPANA / CUPON ================= -->
      <div *ngIf="modalNuevaPromo" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white border border-gray-200 rounded max-w-2xl w-full p-6 space-y-5 my-8 shadow-2xl text-gray-900">
          
          <div class="flex justify-between items-start border-b border-gray-200 pb-4">
            <div>
              <span class="text-xs uppercase tracking-widest text-gray-500 font-mono">Alta Comercial</span>
              <h3 class="text-xl font-bold text-black mt-1">Crear Nueva Campana / Cupon</h3>
            </div>
            <button (click)="modalNuevaPromo = false" class="text-gray-400 hover:text-black text-xl">&times;</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            <!-- Codigo -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Codigo de Cupon *</label>
              <input 
                type="text" 
                [(ngModel)]="nuevaPromo.codigo" 
                placeholder="Ej. VERANO25" 
                class="w-full bg-white border border-gray-300 text-black font-mono font-bold px-3 py-2 rounded focus:border-black focus:outline-none uppercase">
            </div>

            <!-- Nombre -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Nombre de Campana *</label>
              <input 
                type="text" 
                [(ngModel)]="nuevaPromo.nombre" 
                placeholder="Ej. Descuento Temporada Verano" 
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

            <!-- Descripcion -->
            <div class="sm:col-span-2">
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Descripcion Comercial</label>
              <input 
                type="text" 
                [(ngModel)]="nuevaPromo.descripcion" 
                placeholder="Ej. Valido en vestidos y trajes seleccionados" 
                class="w-full bg-white border border-gray-300 text-gray-800 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

            <!-- Tipo de Descuento -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Tipo de Descuento *</label>
              <select 
                [(ngModel)]="nuevaPromo.tipo_descuento" 
                class="w-full bg-white border border-gray-300 text-gray-800 px-3 py-2 rounded focus:border-black focus:outline-none">
                <option value="PORCENTAJE">Porcentaje (%)</option>
                <option value="MONTO_FIJO">Monto Fijo ($ USD)</option>
                <option value="ENVIO_GRATIS">Envio Gratis</option>
              </select>
            </div>

            <!-- Valor de Descuento -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">
                Valor Beneficio {{ nuevaPromo.tipo_descuento === 'PORCENTAJE' ? '(%)' : '($ USD)' }} *
              </label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.valor_descuento" 
                min="0" 
                step="5"
                [disabled]="nuevaPromo.tipo_descuento === 'ENVIO_GRATIS'"
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none disabled:opacity-40">
            </div>

            <!-- Monto Minimo Compra -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Monto Minimo Compra ($ USD)</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.monto_minimo_compra" 
                min="0" 
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

            <!-- Descuento Maximo (Tope) -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Tope Max. Descuento ($ USD)</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.descuento_maximo" 
                min="0" 
                placeholder="Opcional (sin limite)" 
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

            <!-- Limite Global de Usos -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Limite Global de Canjes</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.limite_usos" 
                min="1"
                placeholder="Opcional (ilimitado)"
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

            <!-- Limite por Cliente -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Limite por Cliente</label>
              <input 
                type="number" 
                [(ngModel)]="nuevaPromo.limite_por_cliente" 
                min="1"
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

            <!-- Fechas Vigencia -->
            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Fecha Inicio *</label>
              <input 
                type="date" 
                [(ngModel)]="fechaInicioInput" 
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

            <div>
              <label class="block uppercase tracking-wider text-gray-600 mb-1 font-mono font-semibold">Fecha Fin *</label>
              <input 
                type="date" 
                [(ngModel)]="fechaFinInput" 
                class="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded focus:border-black focus:outline-none">
            </div>

          </div>

          <div class="border-t border-gray-200 pt-4 flex justify-end gap-3">
            <button 
              (click)="modalNuevaPromo = false" 
              class="px-4 py-2 bg-gray-100 text-gray-700 text-xs uppercase tracking-wider rounded hover:bg-gray-200 transition border border-gray-200">
              Cancelar
            </button>
            <button 
              (click)="guardarNuevaPromo()" 
              [disabled]="guardandoPromo"
              class="px-5 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-neutral-800 transition shadow-sm disabled:opacity-50">
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
