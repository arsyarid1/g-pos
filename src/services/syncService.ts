import {
  db,
  ensureAllInitialData,
  DEFAULT_SETTINGS,
} from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  LocalProduct,
  RestaurantSettings,
  Ingredient,
  ProductRecipe,
  StaffUser,
  SyncStats,
  LocalOrder,
  KitchenStatus,
} from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type SyncListener = (stats: SyncStats) => void;

// Fixed UUID untuk single row restaurant settings di Supabase
const SETTINGS_UUID = '00000000-0000-0000-0000-000000000000';

class SyncService {
  private isSyncing = false;
  private lastSyncedAt: Date | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private timerId: number | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify();
        this.syncAll();
      });

      window.addEventListener('offline', () => {
        this.notify();
      });

      // Polling background fallback setiap 20 detik jika online
      this.timerId = window.setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncAll();
        }
      }, 20000);

      // Inisialisasi Realtime WebSocket untuk multi-device
      this.initRealtime();
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.getStats().then((stats) => listener(stats));
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    const stats = await this.getStats();
    this.listeners.forEach((l) => l(stats));
  }

  public async getStats(): Promise<SyncStats> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    let pendingCount = 0;
    try {
      pendingCount = await db.orders
        .where('sync_status')
        .anyOf(['pending', 'failed'])
        .count();
    } catch {
      // Fallback
    }

    return {
      pendingCount,
      isOnline,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  /**
   * Menginisialisasi Supabase Realtime WebSocket Channels
   * Mengalirkan perubahan data antar-device (Kasir, Dapur, Admin) dalam milidetik.
   */
  public initRealtime() {
    if (!isSupabaseConfigured || !supabase) return;
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    try {
      this.realtimeChannel = supabase
        .channel('pos-multi-device-sync')
        // 1. Realtime Products (Katalog Menu)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          async (payload) => {
            const oldItem = payload.old as any;
            const item = payload.new as any;
            if (payload.eventType === 'DELETE') {
              if (oldItem?.id) {
                await db.products.delete(oldItem.id);
                await db.recipes.where('product_id').equals(oldItem.id).delete();
              }
            } else if (item && item.id) {
              const formatted: LocalProduct = {
                id: item.id,
                name: item.name,
                category: item.category,
                price: Number(item.price),
                image_url: item.image_url || undefined,
                description: item.description || undefined,
                is_active: item.is_active ?? true,
                has_variants: Boolean(item.has_variants),
                variants: Array.isArray(item.variants) ? item.variants : undefined,
                created_at: item.created_at || new Date().toISOString(),
                updated_at: item.updated_at || new Date().toISOString(),
              };
              await db.products.put(formatted);
            }
          }
        )
        // 2. Realtime Orders (Kasir & Layar Dapur)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          async (payload) => {
            const oldRow = payload.old as any;
            const row = payload.new as any;
            if (payload.eventType === 'DELETE') {
              if (oldRow?.id) {
                await db.orders.delete(oldRow.id);
              }
            } else if (row && row.id) {
              const existing = await db.orders.get(row.id);
              const items = Array.isArray(row.items) && row.items.length > 0
                ? row.items
                : (existing?.items || []);

              const formattedOrder: LocalOrder = {
                id: row.id,
                invoice_number: row.invoice_number,
                order_type: row.order_type || 'dine_in',
                table_number: row.table_number || null,
                customer_name: row.customer_name || null,
                items,
                subtotal: Number(row.subtotal || row.total_amount || 0),
                tax: Number(row.tax || 0),
                total: Number(row.total_amount || 0),
                payment_method: row.payment_method || 'cash',
                amount_paid: Number(row.amount_paid || row.total_amount || 0),
                change_amount: Number(row.change_amount || 0),
                kitchen_status: (row.kitchen_status as KitchenStatus) || 'pending',
                sync_status: 'synced',
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString(),
              };
              await db.orders.put(formattedOrder);
            }
          }
        )
        // 3. Realtime Ingredients (Stok Bahan Baku)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ingredients' },
          async (payload) => {
            const oldRow = payload.old as any;
            const row = payload.new as any;
            if (payload.eventType === 'DELETE') {
              if (oldRow?.id) {
                await db.ingredients.delete(oldRow.id);
              }
            } else if (row && row.id) {
              const formatted: Ingredient = {
                id: row.id,
                name: row.name,
                unit: row.unit || 'gram',
                current_stock: Number(row.current_stock || 0),
                min_stock_alert: Number(row.min_stock_alert || 0),
                cost_per_unit: Number(row.cost_per_unit || 0),
                updated_at: row.updated_at || new Date().toISOString(),
              };
              await db.ingredients.put(formatted);
            }
          }
        )
        // 4. Realtime Settings (Identitas & Brand)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'restaurant_settings' },
          async (payload) => {
            const d = payload.new as any;
            if (d && d.name) {
              const settings: RestaurantSettings = {
                id: 'default_settings',
                name: d.name || DEFAULT_SETTINGS.name,
                tagline: d.tagline || '',
                address: d.address || '',
                phone: d.phone || '',
                logo_url: d.logo_url || '',
                receipt_footer: d.footer_message || d.receipt_footer || DEFAULT_SETTINGS.receipt_footer,
                tax_percentage: Number(d.tax_percentage) ?? 10,
                updated_at: d.updated_at || new Date().toISOString(),
              };
              await db.settings.put(settings);
            }
          }
        )
        // 5. Realtime Staff (Karyawan & Akses)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'staff' },
          async () => {
            await this.syncStaff();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Terhubung ke Supabase Realtime channel.');
          }
        });
    } catch (err) {
      console.warn('[Realtime] Gagal menginisialisasi realtime subscription:', err);
    }
  }

  /**
   * 1. pullSettings(): Ambil konfigurasi resto dari Supabase
   */
  public async pullSettings(): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[Sync] Pull settings warning:', error.message);
        return;
      }

      if (data) {
        const settings: RestaurantSettings = {
          id: 'default_settings',
          name: data.name || DEFAULT_SETTINGS.name,
          tagline: data.tagline || '',
          address: data.address || '',
          phone: data.phone || '',
          logo_url: data.logo_url || '',
          receipt_footer: data.footer_message || data.receipt_footer || DEFAULT_SETTINGS.receipt_footer,
          tax_percentage: Number(data.tax_percentage) ?? 10,
          updated_at: data.updated_at || new Date().toISOString(),
        };
        await db.settings.put(settings);
      } else {
        const localSettings = await db.settings.get('default_settings');
        if (localSettings) {
          await this.pushSettings(localSettings);
        }
      }
    } catch (err: any) {
      console.warn('[Sync] Pull settings catch:', err?.message || err);
    }
  }

  /**
   * pushSettings(): Simpan pengaturan resto ke Supabase
   */
  public async pushSettings(settings: RestaurantSettings): Promise<void> {
    await db.settings.put(settings);

    if (isSupabaseConfigured && supabase && navigator.onLine) {
      try {
        const payload = {
          id: SETTINGS_UUID,
          name: settings.name,
          tagline: settings.tagline || '',
          address: settings.address || '',
          phone: settings.phone || '',
          logo_url: settings.logo_url || null,
          footer_message: settings.receipt_footer || 'Terima kasih atas kunjungan Anda',
          tax_percentage: settings.tax_percentage,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('restaurant_settings').upsert(payload);
        if (error) throw error;
      } catch (err: any) {
        console.warn('[Sync] Gagal push settings ke Supabase:', err?.message || err);
      }
    }
  }

  /**
   * 2. pullProducts(): Sinkronisasi katalog menu dari Supabase ke lokal Dexie
   */
  public async pullProducts(): Promise<void> {
    try {
      if (!isSupabaseConfigured || !supabase || !navigator.onLine) {
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) {
        console.warn('[Sync] Pull products error:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const remoteIds = new Set(data.map((d) => d.id));
        const formatted: LocalProduct[] = data.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: Number(item.price),
          image_url: item.image_url || undefined,
          description: item.description || undefined,
          is_active: item.is_active ?? true,
          has_variants: Boolean(item.has_variants),
          variants: Array.isArray(item.variants) ? item.variants : undefined,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        }));

        // Simpan data remote ke Dexie lokal
        await db.products.bulkPut(formatted);

        // Hapus produk lokal yang sudah tidak ada di remote Supabase
        const allLocals = await db.products.toArray();
        const toDelete = allLocals.filter((p) => !remoteIds.has(p.id)).map((p) => p.id);
        if (toDelete.length > 0) {
          await db.products.bulkDelete(toDelete);
        }
      } else {
        // Jika di Supabase belum ada data produk, upload produk bawaan lokal jika ada
        const localProducts = await db.products.toArray();
        if (localProducts.length > 0) {
          await this.pushProducts();
        }
      }
    } catch (err: any) {
      console.warn('[Sync] Pull products catch error:', err?.message || err);
    }
  }

  /**
   * 3. saveProduct(): Simpan atau perbarui menu tunggal secara instan ke Dexie & Supabase
   */
  public async saveProduct(product: LocalProduct): Promise<void> {
    // 1. Simpan ke database lokal browser
    await db.products.put(product);

    // 2. Kirim ke Supabase jika online
    if (isSupabaseConfigured && supabase && navigator.onLine) {
      try {
        const payload = {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          image_url: product.image_url || null,
          description: product.description || null,
          is_active: product.is_active ?? true,
          has_variants: Boolean(product.has_variants),
          variants: product.variants || [],
          created_at: product.created_at || new Date().toISOString(),
          updated_at: product.updated_at || new Date().toISOString(),
        };
        const { error } = await supabase.from('products').upsert(payload);
        if (error) {
          console.error('[Sync] Gagal simpan menu ke Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[Sync] Gagal push produk ke Supabase:', err);
      }
    }
  }

  /**
   * 4. deleteProduct(): Hapus menu dari Dexie & Supabase secara permanen
   */
  public async deleteProduct(productId: string): Promise<void> {
    await db.products.delete(productId);
    await db.recipes.where('product_id').equals(productId).delete();

    if (isSupabaseConfigured && supabase && navigator.onLine) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
          console.warn('[Sync] Gagal hapus produk di Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[Sync] Gagal request delete produk ke Supabase:', err);
      }
    }
  }

  /**
   * 5. pushProducts(): Kirim seluruh produk lokal ke Supabase
   */
  public async pushProducts(): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine) return;
    try {
      const localProducts = await db.products.toArray();
      if (localProducts.length === 0) return;

      const payload = localProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        image_url: p.image_url || null,
        description: p.description || null,
        is_active: p.is_active ?? true,
        has_variants: Boolean(p.has_variants),
        variants: p.variants || [],
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      }));

      const { error } = await supabase.from('products').upsert(payload);
      if (error) {
        console.warn('[Sync] Push products Supabase error:', error.message);
      }
    } catch (err) {
      console.warn('[Sync] Push products warning:', err);
    }
  }

  /**
   * 6. pullOrders(): Menarik riwayat transaksi dari Supabase ke Dexie lokal
   * Sangat krusial agar Layar Dapur atau Tablet Kasir lain menerima order real-time.
   */
  public async pullOrders(): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.warn('[Sync] Pull orders error:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const existingOrders = await db.orders.toArray();
        const existingMap = new Map(existingOrders.map((o) => [o.id, o]));

        const formattedOrders: LocalOrder[] = data.map((row) => {
          const localMatch = existingMap.get(row.id);
          const items = Array.isArray(row.items) && row.items.length > 0
            ? row.items
            : (localMatch?.items || []);

          return {
            id: row.id,
            invoice_number: row.invoice_number,
            order_type: row.order_type || 'dine_in',
            table_number: row.table_number || null,
            customer_name: row.customer_name || null,
            items,
            subtotal: Number(row.subtotal || row.total_amount || 0),
            tax: Number(row.tax || 0),
            total: Number(row.total_amount || 0),
            payment_method: row.payment_method || 'cash',
            amount_paid: Number(row.amount_paid || row.total_amount || 0),
            change_amount: Number(row.change_amount || 0),
            kitchen_status: (row.kitchen_status as KitchenStatus) || 'pending',
            sync_status: 'synced',
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at || new Date().toISOString(),
          };
        });

        await db.orders.bulkPut(formattedOrders);
      }
    } catch (err) {
      console.warn('[Sync] Pull orders catch:', err);
    }
  }

  /**
   * 7. updateKitchenStatus(): Mengubah status pesanan dapur dan sinkronisasi ke Supabase
   */
  public async updateKitchenStatus(orderId: string, kitchen_status: KitchenStatus): Promise<void> {
    const nowIso = new Date().toISOString();
    await db.orders.update(orderId, {
      kitchen_status,
      updated_at: nowIso,
    });

    if (isSupabaseConfigured && supabase && navigator.onLine) {
      try {
        await supabase
          .from('orders')
          .update({
            kitchen_status,
            updated_at: nowIso,
          })
          .eq('id', orderId);
      } catch (err) {
        console.warn('[Sync] Gagal update kitchen status di Supabase:', err);
      }
    }
  }

  /**
   * 8. syncIngredients(): Sinkronisasi Master Bahan Baku
   */
  public async syncIngredients(): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine) return;
    try {
      const { data, error } = await supabase.from('ingredients').select('*');
      if (!error && data && data.length > 0) {
        const formatted: Ingredient[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          unit: d.unit,
          current_stock: Number(d.current_stock),
          min_stock_alert: Number(d.min_stock_alert),
          cost_per_unit: Number(d.cost_per_unit),
          updated_at: d.updated_at,
        }));
        await db.ingredients.bulkPut(formatted);
      } else {
        const locals = await db.ingredients.toArray();
        if (locals.length > 0) {
          await supabase.from('ingredients').upsert(locals);
        }
      }
    } catch (err) {
      console.warn('[Sync] Sync ingredients warning:', err);
    }
  }

  /**
   * 9. syncRecipes(): Sinkronisasi BOM / Resep Menu
   */
  public async syncRecipes(): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine) return;
    try {
      const { data, error } = await supabase.from('product_recipes').select('*');
      if (!error && data && data.length > 0) {
        const formatted: ProductRecipe[] = data.map((d) => ({
          id: d.id,
          product_id: d.product_id,
          ingredient_id: d.ingredient_id,
          quantity: Number(d.amount_needed || d.quantity || 0),
        }));
        await db.recipes.bulkPut(formatted);
      } else {
        const locals = await db.recipes.toArray();
        if (locals.length > 0) {
          const payload = locals.map((r) => ({
            id: r.id,
            product_id: r.product_id,
            ingredient_id: r.ingredient_id,
            amount_needed: r.quantity,
          }));
          await supabase.from('product_recipes').upsert(payload);
        }
      }
    } catch (err) {
      console.warn('[Sync] Sync recipes warning:', err);
    }
  }

  /**
   * 10. syncStaff(): Sinkronisasi Data Staf & PIN
   */
  public async syncStaff(): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine) return;
    try {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) return;

      if (data && data.length > 0) {
        const formatted: StaffUser[] = data.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          pin: s.pin,
          is_active: s.is_active ?? true,
          created_at: s.created_at,
        }));
        await db.staff.bulkPut(formatted);
      } else {
        const locals = await db.staff.toArray();
        if (locals.length > 0) {
          await supabase.from('staff').upsert(locals);
        }
      }
    } catch (err) {
      console.warn('[Sync] Sync staff warning:', err);
    }
  }

  /**
   * 11. pushOrders(): Mengambil order dengan sync_status pending atau failed
   * dan mengirimkannya ke Supabase (orders & order_items) serta sinkronkan sisa stok
   */
  public async pushOrders(): Promise<number> {
    if (!isSupabaseConfigured || !supabase || !navigator.onLine) {
      return 0;
    }

    const ordersToSync = await db.orders
      .where('sync_status')
      .anyOf(['pending', 'failed'])
      .toArray();

    if (ordersToSync.length === 0) {
      return 0;
    }

    const ordersPayload = ordersToSync.map((order) => ({
      id: order.id,
      invoice_number: order.invoice_number,
      order_type: order.order_type,
      table_number: order.table_number || null,
      customer_name: order.customer_name || null,
      subtotal: order.subtotal,
      tax: order.tax,
      total_amount: order.total,
      payment_method: order.payment_method,
      payment_status: 'paid',
      amount_paid: order.amount_paid,
      change_amount: order.change_amount,
      kitchen_status: order.kitchen_status || 'pending',
      items: order.items || [],
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString(),
    }));

    const orderItemsPayload = ordersToSync.flatMap((order) =>
      order.items.map((item) => ({
        id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.variant_name
          ? `${item.product_name} (${item.variant_name})`
          : item.product_name,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        price: item.unit_price,
        qty: item.quantity,
        subtotal: item.subtotal || item.unit_price * item.quantity,
        notes: item.notes || null,
      }))
    );

    try {
      // 1. Upsert Orders
      const { error: orderError } = await supabase
        .from('orders')
        .upsert(ordersPayload);

      if (orderError) throw orderError;

      // 2. Upsert Order Items
      if (orderItemsPayload.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .upsert(orderItemsPayload);

        if (itemsError) throw itemsError;
      }

      // 3. Update status lokal menjadi 'synced'
      await db.transaction('rw', db.orders, async () => {
        for (const order of ordersToSync) {
          await db.orders.update(order.id, {
            sync_status: 'synced',
            updated_at: new Date().toISOString(),
          });
        }
      });

      // 4. Update stok bahan baku ke Supabase agar tetap sinkron
      const currentIngredients = await db.ingredients.toArray();
      if (currentIngredients.length > 0) {
        await supabase.from('ingredients').upsert(currentIngredients);
      }

      return ordersToSync.length;
    } catch (err: any) {
      this.lastError = err?.message || 'Gagal push orders ke Supabase';
      await db.transaction('rw', db.orders, async () => {
        for (const order of ordersToSync) {
          await db.orders.update(order.id, {
            sync_status: 'failed',
            updated_at: new Date().toISOString(),
          });
        }
      });
      throw err;
    }
  }

  public async syncSingleOrder(orderId: string): Promise<boolean> {
    if (!navigator.onLine) {
      this.lastError = 'Tidak dapat sinkronisasi: Perangkat sedang offline';
      await this.notify();
      return false;
    }

    if (!isSupabaseConfigured || !supabase) {
      this.lastError = 'Supabase belum dikonfigurasi di .env';
      await this.notify();
      return false;
    }

    const order = await db.orders.get(orderId);
    if (!order) return false;

    this.isSyncing = true;
    this.lastError = null;
    await this.notify();

    try {
      const orderPayload = {
        id: order.id,
        invoice_number: order.invoice_number,
        order_type: order.order_type,
        table_number: order.table_number || null,
        customer_name: order.customer_name || null,
        subtotal: order.subtotal,
        tax: order.tax,
        total_amount: order.total,
        payment_method: order.payment_method,
        payment_status: 'paid',
        amount_paid: order.amount_paid,
        change_amount: order.change_amount,
        kitchen_status: order.kitchen_status || 'pending',
        items: order.items || [],
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || new Date().toISOString(),
      };

      const itemsPayload = order.items.map((item) => ({
        id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.variant_name
          ? `${item.product_name} (${item.variant_name})`
          : item.product_name,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        price: item.unit_price,
        qty: item.quantity,
        subtotal: item.subtotal || item.unit_price * item.quantity,
        notes: item.notes || null,
      }));

      const { error: orderError } = await supabase
        .from('orders')
        .upsert(orderPayload);
      if (orderError) throw orderError;

      if (itemsPayload.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .upsert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      await db.orders.update(orderId, {
        sync_status: 'synced',
        updated_at: new Date().toISOString(),
      });

      this.lastSyncedAt = new Date();
      return true;
    } catch (err: any) {
      console.error('[Sync] Single order sync failed:', err);
      this.lastError = err?.message || 'Gagal mengirim order ke Supabase';
      await db.orders.update(orderId, {
        sync_status: 'failed',
        updated_at: new Date().toISOString(),
      });
      return false;
    } finally {
      this.isSyncing = false;
      await this.notify();
    }
  }

  public async syncAll(): Promise<{ pushedCount: number }> {
    if (this.isSyncing) return { pushedCount: 0 };
    this.isSyncing = true;
    this.lastError = null;
    await this.notify();

    let pushed = 0;
    try {
      await ensureAllInitialData();

      if (navigator.onLine) {
        await Promise.all([
          this.pullSettings(),
          this.pullProducts(),
          this.pullOrders(),
          this.syncIngredients(),
          this.syncRecipes(),
          this.syncStaff(),
        ]);
        pushed = await this.pushOrders();
      }
      this.lastSyncedAt = new Date();
    } catch (err: any) {
      console.error('[Sync] Error syncing:', err);
      this.lastError = err?.message || 'Terjadi kesalahan sinkronisasi';
    } finally {
      this.isSyncing = false;
      await this.notify();
    }

    return { pushedCount: pushed };
  }

  public destroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    if (this.realtimeChannel && supabase) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}

export const syncService = new SyncService();
