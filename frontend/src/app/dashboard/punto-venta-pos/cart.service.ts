import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export interface CartItem {
  variante_id: number;
  prenda_id: number;
  prenda_nombre: string;
  prenda_sku: string;
  variante_sku: string;
  talla: string;
  color: string;
  color_hex?: string;
  precio_unitario: number;
  cantidad: number;
  imagen_url?: string;
}

const CART_STORAGE_KEY = 'atelier_noir_cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>(this.loadFromStorage());

  readonly items$ = this.itemsSubject.asObservable();
  readonly count$ = this.items$.pipe(
    map(items => items.reduce((acc, item) => acc + item.cantidad, 0))
  );
  readonly subtotal$ = this.items$.pipe(
    map(items => items.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0))
  );

  private loadFromStorage(): CartItem[] {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading cart from storage', e);
    }
    return [];
  }

  private saveToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to storage', e);
    }
  }

  getItems(): CartItem[] {
    return this.itemsSubject.value;
  }

  getCount(): number {
    return this.getItems().reduce((acc, item) => acc + item.cantidad, 0);
  }

  getSubtotal(): number {
    return this.getItems().reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0);
  }

  addItem(newItem: Omit<CartItem, 'cantidad'>, cantidad: number = 1): void {
    const current = [...this.itemsSubject.value];
    const index = current.findIndex(i => i.variante_id === newItem.variante_id);

    if (index >= 0) {
      current[index] = {
        ...current[index],
        cantidad: current[index].cantidad + cantidad
      };
    } else {
      current.push({
        ...newItem,
        cantidad: Math.max(1, cantidad)
      });
    }

    this.saveToStorage(current);
    this.itemsSubject.next(current);
  }

  updateQuantity(variante_id: number, cantidad: number): void {
    let current = [...this.itemsSubject.value];
    if (cantidad <= 0) {
      current = current.filter(i => i.variante_id !== variante_id);
    } else {
      current = current.map(i => i.variante_id === variante_id ? { ...i, cantidad } : i);
    }

    this.saveToStorage(current);
    this.itemsSubject.next(current);
  }

  removeItem(variante_id: number): void {
    const current = this.itemsSubject.value.filter(i => i.variante_id !== variante_id);
    this.saveToStorage(current);
    this.itemsSubject.next(current);
  }

  clear(): void {
    this.saveToStorage([]);
    this.itemsSubject.next([]);
  }
}
