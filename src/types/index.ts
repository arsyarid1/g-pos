export type ProductCategory = 'All' | 'Makanan' | 'Minuman' | 'Snack' | 'Dessert';

export interface ProductVariant {
  id: string; // UUID
  name: string; // misal: 'Es / Dingin', 'Hangat', 'Kemasan Box 250g', 'Pouch 100g'
  price: number;
}

export interface LocalProduct {
  id: string; // UUID
  name: string;
  category: string;
  price: number; // Harga dasar atau harga mulai dari
  image_url?: string;
  description?: string;
  is_active: boolean;
  has_variants?: boolean;
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface LocalOrderItem {
  id: string; // UUID
  order_id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string; // misal: 'Es / Dingin' atau 'Box Besar'
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

export type OrderType = 'dine_in' | 'takeaway';
export type PaymentMethod = 'cash' | 'qris' | 'card';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type KitchenStatus = 'pending' | 'cooking' | 'ready' | 'served';

export interface LocalOrder {
  id: string; // UUID
  invoice_number: string;
  order_type: OrderType;
  table_number?: string | null;
  customer_name?: string | null;
  items: LocalOrderItem[];
  subtotal: number;
  tax: number; // PB1
  total: number;
  payment_method: PaymentMethod;
  amount_paid: number;
  change_amount: number;
  sync_status: SyncStatus;
  kitchen_status?: KitchenStatus;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  cartItemId: string; // Unique ID per baris keranjang (cth: `${product.id}-${variant.id || 'default'}`)
  product: LocalProduct;
  variant?: ProductVariant;
  quantity: number;
  notes: string;
}

export interface SyncStats {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

/* ========================================================
   MODUL BACK-OFFICE & WHITE-LABEL TYPES
   ======================================================== */

export interface RestaurantSettings {
  id: string; // 'default_settings'
  name: string;
  tagline: string;
  address: string;
  phone: string;
  logo_url?: string;
  receipt_footer: string;
  tax_percentage: number; // PB1 dalam persen, misal: 10
  updated_at: string;
}

export type IngredientUnit = 'gram' | 'ml' | 'pcs' | 'kg' | 'liter' | 'lembar' | 'porsi';

export interface Ingredient {
  id: string; // UUID
  name: string;
  unit: IngredientUnit;
  current_stock: number;
  min_stock_alert: number;
  cost_per_unit: number; // HPP per satuan
  updated_at: string;
}

export interface ProductRecipe {
  id: string; // UUID
  product_id: string;
  ingredient_id: string;
  quantity: number; // Jumlah bahan yang terpakai per 1 porsi menu
}

export type StaffRole = 'admin' | 'cashier' | 'kitchen';

export interface StaffUser {
  id: string; // UUID
  name: string;
  role: StaffRole;
  pin: string; // 4-digit PIN
  is_active: boolean;
  created_at: string;
}

export interface StockAdjustmentLog {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  type: 'in' | 'out' | 'adjustment';
  quantity_changed: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
}
