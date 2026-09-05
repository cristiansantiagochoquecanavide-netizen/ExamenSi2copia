export interface InventarioState {
  id?: string;
  name?: string;
  status: 'active' | 'inactive' | 'pending';
}
