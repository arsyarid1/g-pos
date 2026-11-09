import Dexie, { type Table } from 'dexie';
import type {
  LocalProduct,
  LocalOrder,
  RestaurantSettings,
  Ingredient,
  ProductRecipe,
  StaffUser,
  StockAdjustmentLog,
} from '../types';

export class RestaurantPOSDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  orders!: Table<LocalOrder, string>;
  settings!: Table<RestaurantSettings, string>;
  ingredients!: Table<Ingredient, string>;
  recipes!: Table<ProductRecipe, string>;
  staff!: Table<StaffUser, string>;
  stock_logs!: Table<StockAdjustmentLog, string>;

  constructor() {
    super('RestaurantPOSDB');
    this.version(1).stores({
      products: 'id, category, is_active, updated_at',
      orders: 'id, invoice_number, sync_status, created_at',
    });
    this.version(2).stores({
      products: 'id, category, is_active, updated_at',
      orders: 'id, invoice_number, sync_status, created_at',
      settings: 'id, updated_at',
      ingredients: 'id, name, current_stock, min_stock_alert, updated_at',
      recipes: 'id, product_id, ingredient_id',
      staff: 'id, role, pin, is_active',
      stock_logs: 'id, ingredient_id, created_at',
    });
  }
}

export const db = new RestaurantPOSDatabase();

/* ========================================================
   INITIAL SEED DATA
   ======================================================== */

export const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 'default_settings',
  name: 'GEMOELAI',
  tagline: 'Rasa Autentik Nusantara',
  address: 'Jl. Kuliner Nusantara No. 88, Jakarta',
  phone: '0812-3456-7890',
  logo_url: '',
  receipt_footer: 'Terima Kasih Atas Kunjungan Anda!\nStruk ini merupakan bukti pembayaran yang sah.',
  tax_percentage: 10,
  updated_at: new Date().toISOString(),
};

// Akun Staf Bawaan Sistem (Admin: 1234, Kasir: 1111, Dapur: 2222)
export const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'staff-001',
    name: 'Bapak Arsyad (Owner/Admin)',
    role: 'admin',
    pin: '1234',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'staff-002',
    name: 'Budi Santoso',
    role: 'cashier',
    pin: '1111',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'staff-003',
    name: 'Siti Rahma (Chef)',
    role: 'kitchen',
    pin: '2222',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Data template menu, resep, dan bahan baku dikosongkan agar pengguna dapat menginput data riil
export const INITIAL_INGREDIENTS: Ingredient[] = [];
export const INITIAL_RECIPES: ProductRecipe[] = [];
export const INITIAL_PRODUCTS: LocalProduct[] = [];

const DUMMY_PRODUCT_NAMES = new Set([
  'nasi goreng spesial',
  'ayam bakar madu',
  'mie goreng seafood',
  'sate ayam madura (10 tusuk)',
  'sate ayam madura',
  'soto betawi kuah susu',
  'soto betawi daging',
  'nasi liwet solo komplit',
  'nasi liwet solo',
  'kopi susu gula aren',
  'jeruk peras segar',
  'es jeruk peras',
  'teh manis nusantara',
  'es teh manis jumbo',
  'es teh manis',
  'jus alpukat kocok',
  'tahu walik crispy banyuwangi',
  'tahu walik crispy',
  'pisang goreng keju cokelat',
  'dimsum ayam udang (4 pcs)',
  'dimsum ayam udang',
  'es cendol durian',
]);

const DUMMY_INGREDIENT_NAMES = new Set([
  'beras premium ramos',
  'daging ayam fillet',
  'daging sapi pilihan',
  'telur ayam negeri',
  'minyak goreng sawit',
  'biji kopi arabika house blend',
  'susu segar uht & gula aren',
  'jeruk manis peras',
  'daun teh melati pilihan',
  'mie basah telur',
]);

/* ========================================================
   SEEDED INITIALIZER FUNCTIONS
   ======================================================== */

/**
 * Membersihkan seluruh data produk, resep, bahan baku, dan log stok template bawaan
 * dari IndexedDB lokal, namun MEMPERTAHANKAN seluruh akun user/staf dan konfigurasi resto.
 */
export async function purgeTemplateData(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // 1. Bersihkan produk template bawaan (berdasarkan ID atau Nama template)
    const allProducts = await db.products.toArray();
    const toDeleteProd = allProducts
      .filter((p) => p.id.startsWith('prod-') || p.id.startsWith('demo-') || DUMMY_PRODUCT_NAMES.has(p.name.toLowerCase().trim()))
      .map((p) => p.id);
    if (toDeleteProd.length > 0) {
      await db.products.bulkDelete(toDeleteProd);
      console.log(`[DB] Berhasil membersihkan ${toDeleteProd.length} produk template.`);
    }

    // 2. Bersihkan bahan baku template bawaan
    const allIngredients = await db.ingredients.toArray();
    const toDeleteIng = allIngredients
      .filter((i) => i.id.startsWith('ing-') || i.id.startsWith('demo-') || DUMMY_INGREDIENT_NAMES.has(i.name.toLowerCase().trim()))
      .map((i) => i.id);
    if (toDeleteIng.length > 0) {
      await db.ingredients.bulkDelete(toDeleteIng);
      console.log(`[DB] Berhasil membersihkan ${toDeleteIng.length} bahan baku template.`);
    }

    // 3. Bersihkan resep template bawaan
    const allRecipes = await db.recipes.toArray();
    const toDeleteRec = allRecipes
      .filter((r) => r.id.startsWith('rec-') || r.id.startsWith('demo-') || r.product_id.startsWith('prod-'))
      .map((r) => r.id);
    if (toDeleteRec.length > 0) {
      await db.recipes.bulkDelete(toDeleteRec);
      console.log(`[DB] Berhasil membersihkan ${toDeleteRec.length} resep template.`);
    }
  } catch (err) {
    console.error('[DB] Gagal membersihkan data template:', err);
  }
}

/**
 * Mengosongkan 100% seluruh menu produk, resep, dan inventori bahan baku (bersih total)
 * tetapi MEMPERTAHANKAN user staf (Admin, Kasir, Dapur) dan pengaturan resto.
 */
export async function clearAllMenuAndInventory(): Promise<void> {
  await db.transaction('rw', [db.products, db.recipes, db.ingredients, db.stock_logs], async () => {
    await db.products.clear();
    await db.recipes.clear();
    await db.ingredients.clear();
    await db.stock_logs.clear();
  });
  console.log('[DB] Seluruh menu dan inventori berhasil dikosongkan.');
}

export async function clearTemplateMenuAndInventory(): Promise<void> {
  await purgeTemplateData();
}

export async function ensureDefaultProducts(): Promise<void> {
  // Master menu produk kini kosong dan siap diisi data riil oleh pengguna
}

export async function ensureDefaultSettings(): Promise<RestaurantSettings> {
  let settings = await db.settings.get('default_settings');
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS);
    settings = DEFAULT_SETTINGS;
  }
  return settings;
}

export async function ensureDefaultIngredients(): Promise<void> {
  // Master bahan baku inventori kini kosong dan siap diisi data riil oleh pengguna
}

export async function ensureDefaultRecipes(): Promise<void> {
  // Master resep BOM kini kosong dan siap diisi data riil oleh pengguna
}

export async function ensureDefaultStaff(): Promise<void> {
  const count = await db.staff.count();
  if (count === 0) {
    await db.staff.bulkPut(INITIAL_STAFF);
    return;
  }
  // Pastikan akun staf bawaan (Admin 1234, Kasir 1111, Dapur 2222) selalu ada
  for (const s of INITIAL_STAFF) {
    const existing = await db.staff.get(s.id);
    if (!existing) {
      await db.staff.put(s);
    }
  }
}

export async function ensureAllInitialData(): Promise<void> {
  await purgeTemplateData();
  await Promise.all([
    ensureDefaultProducts(),
    ensureDefaultSettings(),
    ensureDefaultIngredients(),
    ensureDefaultRecipes(),
    ensureDefaultStaff(),
  ]);
}

/**
 * Engine Pengurangan Stok Otomatis Berdasarkan BOM (Resep Menu):
 * Dipanggil saat pesanan baru selesai dibuat/disimpan.
 */
export async function deductIngredientsForOrder(order: LocalOrder): Promise<void> {
  try {
    for (const item of order.items) {
      const recipes = await db.recipes.where('product_id').equals(item.product_id).toArray();
      if (!recipes || recipes.length === 0) continue;

      for (const recipe of recipes) {
        const totalDeduction = recipe.quantity * item.quantity;
        const ing = await db.ingredients.get(recipe.ingredient_id);
        if (ing) {
          const newStock = Math.max(0, ing.current_stock - totalDeduction);
          await db.ingredients.update(ing.id, {
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          });

          // Catat log stok opname otomatis
          await db.stock_logs.add({
            id: crypto.randomUUID(),
            ingredient_id: ing.id,
            ingredient_name: ing.name,
            type: 'out',
            quantity_changed: -totalDeduction,
            previous_stock: ing.current_stock,
            new_stock: newStock,
            reason: `Penjualan ${item.quantity}x ${item.product_name} (${order.invoice_number})`,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('[Inventory] Error deducting ingredients for order:', err);
  }
}

// Inisialisasi otomatis data bawaan saat aplikasi dimuat
if (typeof window !== 'undefined') {
  ensureAllInitialData().catch((err) => {
    console.warn('[DB] Auto initialization warning:', err);
  });
}
