import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, purgeTemplateData } from './lib/db';
import { updateFavicon } from './lib/favicon';
import type { CartItem, LocalProduct, LocalOrder, OrderType, ProductVariant, StaffUser } from './types';
import { useSync } from './hooks/useSync';
import { ProductGrid } from './components/pos/ProductGrid';
import { Cart } from './components/pos/Cart';
import { CheckoutModal } from './components/pos/CheckoutModal';
import { ReceiptModal } from './components/pos/ReceiptModal';
import { OrderHistoryDrawer } from './components/pos/OrderHistoryDrawer';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { KitchenDashboard } from './components/kitchen/KitchenDashboard';
import { LoginPage } from './components/auth/LoginPage';
import { ProductVariantModal } from './components/pos/ProductVariantModal';
import { formatRupiah } from './lib/utils';
import { Utensils, History, LayoutDashboard, LogOut, User, ShoppingBag, ArrowRight } from 'lucide-react';

export function App() {
  // Mode Navigasi Utama: 'login' | 'pos' | 'kitchen' | 'admin'
  const [appMode, setAppMode] = useState<'login' | 'pos' | 'kitchen' | 'admin'>('login');
  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(null);

  // Ambil data settings resto secara reaktif dari IndexedDB
  const settings = useLiveQuery(() => db.settings.get('default_settings'), []) || null;

  // Sinkronisasi Favicon dan Title Browser secara otomatis setiap kali logo atau nama restoran berubah
  useEffect(() => {
    if (settings) {
      updateFavicon(settings.logo_url, settings.name);
    }
  }, [settings?.logo_url, settings?.name]);

  // Pembersihan otomatis data dummy/template bawaan jika tersimpan di IndexedDB browser
  useEffect(() => {
    purgeTemplateData();
  }, []);

  // Sync state & background service hook
  const { isSyncing, pendingCount, syncNow, syncSingleOrder } = useSync();

  // POS Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState<string>('01');
  const [customerName, setCustomerName] = useState<string>('');
  // Mode Tab untuk Layar Kecil / Tablet: 'menu' | 'cart'
  const [mobilePosTab, setMobilePosTab] = useState<'menu' | 'cart'>('menu');

  // Modals & Drawers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<LocalOrder | null>(null);
  const [isReprintMode, setIsReprintMode] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<LocalProduct | null>(null);

  // Cart operations (Mendukung Varian / Kemasan berbeda)
  const handleAddToCart = useCallback(
    (product: LocalProduct, variant?: ProductVariant, quantity = 1, notes = '') => {
      const cartItemId = `${product.id}-${variant ? variant.id : 'default'}`;
      setCartItems((prev) => {
        const existing = prev.find((item) => item.cartItemId === cartItemId);
        if (existing) {
          return prev.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  notes: notes || item.notes,
                }
              : item
          );
        }
        return [...prev, { cartItemId, product, variant, quantity, notes }];
      });
    },
    []
  );

  const handleUpdateQuantity = useCallback((cartItemId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          const id = item.cartItemId || `${item.product.id}-${item.variant ? item.variant.id : 'default'}`;
          if (id === cartItemId || item.product.id === cartItemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  }, []);

  const handleRemoveItem = useCallback((cartItemId: string) => {
    setCartItems((prev) =>
      prev.filter((item) => {
        const id = item.cartItemId || `${item.product.id}-${item.variant ? item.variant.id : 'default'}`;
        return id !== cartItemId && item.product.id !== cartItemId;
      })
    );
  }, []);

  const handleUpdateNotes = useCallback((cartItemId: string, notes: string) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, notes } : item
      )
    );
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Saat pesanan selesai di CheckoutModal
  const handleOrderCompleted = useCallback((order: LocalOrder) => {
    setActiveReceiptOrder(order);
    setIsReprintMode(false);
    setCartItems([]);
  }, []);

  // Lihat struk lama dari Riwayat Transaksi
  const handleViewPastReceipt = useCallback((order: LocalOrder) => {
    setActiveReceiptOrder(order);
    setIsReprintMode(true);
  }, []);

  // Login handler
  const handleLoginSuccess = (staff: StaffUser) => {
    setCurrentStaff(staff);
    if (staff.role === 'cashier') {
      setAppMode('pos');
    } else if (staff.role === 'kitchen') {
      setAppMode('kitchen');
    } else {
      setAppMode('admin');
    }
  };

  // Logout handler (kembali ke halaman login)
  const handleLogout = () => {
    setCurrentStaff(null);
    setAppMode('login');
  };

  // 1. Tampilan Halaman Login (Jika belum login atau mode 'login')
  if (appMode === 'login' || !currentStaff) {
    return <LoginPage settings={settings} onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Tampilan Layar Dapur (Kitchen Display System / KDS)
  if (appMode === 'kitchen') {
    return (
      <KitchenDashboard
        settings={settings}
        currentStaff={currentStaff}
        onLogout={handleLogout}
        onReturnToAdmin={currentStaff?.role === 'admin' ? () => setAppMode('admin') : undefined}
      />
    );
  }

  // 3. Tampilan Back-Office / Admin Dashboard
  if (appMode === 'admin') {
    return (
      <AdminDashboard
        settings={settings}
        onSettingsSaved={(newSettings) => db.settings.put(newSettings)}
        onReturnToPOS={() => setAppMode('pos')}
        onOpenKitchen={() => setAppMode('kitchen')}
        onLockAdmin={handleLogout}
        onViewReceipt={handleViewPastReceipt}
      />
    );
  }

  // Hitung jumlah item dan total belanja keranjang kasir
  const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + (item.variant ? item.variant.price : item.product.price) * item.quantity,
    0
  );
  const cartTax = Math.round(cartSubtotal * ((settings?.tax_percentage ?? 10) / 100));
  const cartGrandTotal = cartSubtotal + cartTax;

  // 4. Tampilan Utama: POS Kasir (Tampilan Bersih & Minimalis Sesuai Permintaan)
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Top Application Bar Kasir */}
      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-2xs">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.name}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain border-0 shadow-none bg-transparent"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Utensils className="w-5 h-5 stroke-2" />
            </div>
          )}
          <div>
            <h1 className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 leading-snug">
              {settings?.name || 'GastroPOS'}
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {settings?.tagline || 'Sistem Kasir Penjualan'}
            </p>
          </div>
        </div>

        {/* Tab Switcher untuk Layar Kecil/Tablet: Menu Makanan vs Pesanan */}
        <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/80">
          <button
            type="button"
            onClick={() => setMobilePosTab('menu')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              mobilePosTab === 'menu'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Menu</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePosTab('cart')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              mobilePosTab === 'cart'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Pesanan</span>
            {totalCartCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  mobilePosTab === 'cart'
                    ? 'bg-white text-orange-600'
                    : 'bg-orange-600 text-white'
                }`}
              >
                {totalCartCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Action Controls: Riwayat & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Kembali ke Admin jika yang sedang membuka POS adalah akun Admin */}
          {currentStaff?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setAppMode('admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer shadow-2xs"
              title="Kembali ke Back-Office Admin"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kembali ke Admin</span>
            </button>
          )}

          {/* Riwayat Transaksi Button */}
          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200/70"
            title="Buka Riwayat Transaksi & Cetak Ulang Struk"
          >
            <History className="w-4 h-4 text-orange-600" />
            <span className="hidden sm:inline">Riwayat Transaksi</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          {/* Staff Info & Tombol Logout */}
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold items-center gap-1.5 text-slate-700">
              <User className="w-3.5 h-3.5 text-orange-600" />
              <span className="truncate max-w-[120px]">
                {currentStaff?.name ? currentStaff.name.split(' ')[0] : 'Kasir'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition border border-slate-200 cursor-pointer"
              title="Keluar dari akun kasir ke halaman login"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Screen Work Area (Responsif di Layar Tablet & Layar Kecil) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Kolom Kiri: Katalog Menu & Filter */}
        <section
          className={`flex-1 h-full overflow-hidden flex flex-col ${
            mobilePosTab === 'cart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex-1 overflow-hidden">
            <ProductGrid
              cartItems={cartItems}
              onAddToCart={(product) => handleAddToCart(product)}
              onOpenVariantModal={(product) => setSelectedProductForVariant(product)}
            />
          </div>

          {/* Floating Bottom Bar di Layar Kecil saat Keranjang Terisi */}
          {totalCartCount > 0 && (
            <div className="lg:hidden p-3 bg-white border-t border-slate-200 shadow-xl shrink-0 z-10 animate-fade-in">
              <button
                type="button"
                onClick={() => setMobilePosTab('cart')}
                className="w-full py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-orange-500/25 flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-extrabold">
                    {totalCartCount} item
                  </span>
                  <span className="text-white font-extrabold tracking-tight">
                    {formatRupiah(cartGrandTotal)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold bg-white/15 px-3 py-1.5 rounded-xl">
                  <span>Lihat Pesanan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          )}
        </section>

        {/* Kolom Kanan: Keranjang Pesanan & Ringkasan Checkout */}
        <aside
          className={`w-full lg:w-[420px] xl:w-[460px] h-full overflow-hidden shrink-0 shadow-lg lg:shadow-none z-10 ${
            mobilePosTab === 'menu' ? 'hidden lg:flex flex-col' : 'flex flex-col'
          }`}
        >
          <Cart
            cartItems={cartItems}
            orderType={orderType}
            setOrderType={setOrderType}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
            customerName={customerName}
            setCustomerName={setCustomerName}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdateNotes={handleUpdateNotes}
            onClearCart={handleClearCart}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            taxPercentage={settings?.tax_percentage ?? 10}
            onBackToMenu={() => setMobilePosTab('menu')}
          />
        </aside>
      </main>

      {/* 1. Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        orderType={orderType}
        tableNumber={tableNumber}
        customerName={customerName}
        onOrderCompleted={handleOrderCompleted}
        taxPercentage={settings?.tax_percentage ?? 10}
      />

      {/* 2. Modal Sukses & Cetak Struk Thermal (58mm / 80mm) */}
      <ReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        onNewOrder={handleClearCart}
        isReprint={isReprintMode}
        settings={settings}
      />

      {/* 3. Drawer Riwayat Transaksi & Status Sync */}
      <OrderHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onViewReceipt={handleViewPastReceipt}
        onSyncAll={syncNow}
        onSyncSingle={syncSingleOrder}
        isSyncing={isSyncing}
      />

      {/* 4. Modal Pemilihan Varian / Kemasan Produk */}
      <ProductVariantModal
        isOpen={Boolean(selectedProductForVariant)}
        onClose={() => setSelectedProductForVariant(null)}
        product={selectedProductForVariant}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

export default App;
