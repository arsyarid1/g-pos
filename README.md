# GastroPOS - White-label Restaurant Point of Sale & Back-Office (SPA)
> **Offline-First / Local-First Restaurant POS SPA & White-label Back-Office Dashboard** yang dibangun menggunakan React 19, Vite, TypeScript, Tailwind CSS, Dexie.js (IndexedDB), dan Supabase Client. Siap di-deploy langsung ke **Cloudflare Pages**.

---

## 🚀 Fitur Lengkap

### 1. Navigasi & Proteksi Sesi Admin (Role Guard)
- **Mode Switcher**: Beralih mudah antara mode **"Kasir POS"** dan **"Back-Office / Admin"** melalui header navigasi.
- **PIN Protection Keypad**: Akses ke Back-Office diproteksi dengan 4-digit PIN. Validasi dilakukan terhadap staf berkategori Admin di database lokal. (*Default PIN Admin: 1234*).
- **Lock Session**: Tombol "Kunci Akses" untuk mengamankan kembali konsol admin saat kasir berganti shift.

### 2. Pengaturan White-label & Detail Restoran
- Form konfigurasi identitas brand:
  - Nama Restoran, Slogan/Tagline, Alamat Lengkap, No. Telepon / WhatsApp.
  - URL Logo Restoran (dengan live thumbnail preview).
  - Pesan Footer kustom untuk Struk Thermal.
  - Pengaturan Pajak Restoran dinamis (PB1 %).
- **Live Preview Struk**: Menampilkan preview cetak struk thermal real-time saat data restoran diubah.
- **Branding Dinamis Terintegrasi**: Perubahan nama resto, logo, dan kontak langsung diterapkan ke header aplikasi kasir dan seluruh struk transaksi thermal pelanggan.

### 3. Manajemen Menu & Resep (BOM - Bill of Materials)
- **CRUD Menu Lengkap**: Tambah, edit, nonaktifkan, dan hapus menu makanan, minuman, snack, serta dessert.
- **Atur Resep / BOM**:
  - Modal penetapan bahan baku yang terpakai per 1 porsi menu (misal: *Nasi Goreng Spesial* membutuhkan 180g beras, 1 pcs telur, 60g ayam, 20ml minyak).
  - **Analisis Finansial Otomatis**: Menghitung estimasi total HPP (Harga Pokok Produksi) bahan baku dan margin laba kotor terhadap harga jual.

### 4. Manajemen Inventori & Bahan Baku
- **Master Bahan Baku**: Nama bahan, satuan (*gram, ml, pcs, kg, liter, dll*), stok saat ini, batas minimum alert, dan biaya HPP per satuan.
- **Peringatan Stok Kritis**: Badge merah menyala dan filter satu klik untuk mendeteksi bahan baku yang menipis (`current_stock <= min_stock_alert`).
- **Penyesuaian Stok / Stock Opname Fisik**:
  - Opsi: Tambah Stok Masuk (+), Kurangi Stok Keluar / Rusak (-), atau Set Stok Fisik Aktual (=).
  - Pencatatan alasan penyesuaian (misal: *Belanja pasar pagi, bahan rusak/expired, selisih hitung opname*).
- **Log Mutasi & Audit Trail**: Tab riwayat mutasi otomatis yang mencatat pengurangan stok akibat penjualan di kasir maupun penyesuaian manual.

### 5. Engine Pengurangan Stok Otomatis
- Setiap kali transaksi pesanan diselesaikan di kasir POS:
  - Sistem otomatis menelusuri seluruh menu yang terjual dan resep (BOM) terkait di IndexedDB.
  - Mengurangi stok fisik bahan baku pada tabel `ingredients` secara instan.
  - Mencatat riwayat mutasi ke tabel `stock_logs`.
  - Mengunggah sisa stok terbaru ke Supabase saat sinkronisasi online berlangsung.

### 6. Manajemen Karyawan / Staf
- Tabel staf kasir, tim dapur, dan administrator.
- Tambah & edit staf dengan **4-digit PIN akses cepat** dan toggle status aktif/nonaktif.

### 7. POS Kasir & Cetak Struk Thermal (58mm / 80mm)
- Split screen kasir responsif: pencarian cepat, filter kategori, pilihan Dine-In / Takeaway, dan keranjang belanja.
- Modal checkout dengan multi-metode pembayaran: Tunai (kalkulator kembalian otomatis & pecahan cepat), QRIS, dan Kartu/EDC.
- Preview & Cetak Struk Thermal dengan opsi ukuran kertas **58mm** atau **80mm** via `window.print()` yang bersih dari elemen browser latar belakang.
- Drawer riwayat transaksi reaktif dengan status sync real-time (Pending, Synced, Failed).

---

## 📁 Struktur Direktori

```text
├── public/
│   └── _redirects                  # Konfigurasi SPA routing Cloudflare Pages
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx         # Layout master Back-Office & sidebar navigasi
│   │   │   ├── AdminPinModal.tsx          # Keypad proteksi PIN 4-digit akses admin
│   │   │   ├── InventoryView.tsx          # Master bahan baku, stok kritis & modal stock opname
│   │   │   ├── MenuManagementView.tsx     # CRUD menu & modal penetapan resep (BOM)
│   │   │   ├── RestaurantSettingsView.tsx # Form white-label branding & live receipt preview
│   │   │   └── StaffManagementView.tsx    # Manajemen user/staf, role & PIN akses
│   │   └── pos/
│   │       ├── Cart.tsx                   # Panel keranjang belanja & kalkulasi pajak dinamis
│   │       ├── CheckoutModal.tsx          # Modal pembayaran & trigger pengurangan stok otomatis
│   │       ├── OrderHistoryDrawer.tsx     # Drawer riwayat transaksi reaktif & status sync
│   │       ├── ProductGrid.tsx            # Grid menu kasir, pencarian instan & filter kategori
│   │       ├── ReceiptModal.tsx           # Cetak struk thermal 58mm/80mm ber-branding dinamis
│   │       └── SyncBadge.tsx              # Indikator koneksi & status sinkronisasi
│   ├── hooks/
│   │   └── useSync.ts                     # Hook status koneksi & sinkronisasi
│   ├── lib/
│   │   ├── db.ts                          # Schema Dexie (products, orders, settings, ingredients, recipes, staff)
│   │   ├── supabase.ts                    # Supabase client initializer
│   │   └── utils.ts                       # Format Rupiah, invoice, format tanggal
│   ├── services/
│   │   └── syncService.ts                 # Two-way sync engine (Settings, Products, Ingredients, Recipes, Staff, Orders)
│   ├── types/
│   │   └── index.ts                       # TypeScript interfaces
│   ├── App.tsx                            # Router & switch mode Kasir POS vs Back-Office
│   ├── index.css                          # Tailwind CSS & print media thermal receipt
│   └── main.tsx                           # Entry point React DOM
├── supabase-schema.sql                    # Skrip DDL SQL untuk seluruh tabel Supabase
├── vite.config.ts                         # Konfigurasi Vite & Tailwind plugin
└── package.json
```

---

## ⚙️ Menjalankan Aplikasi Secara Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan server development
npm run dev

# 3. Build untuk produksi (Cloudflare Pages)
npm run build
```
Buka browser di `http://localhost:5173`.
- **Default PIN Admin**: `1234`
- **Default PIN Kasir**: `1111`
- **Default PIN Dapur**: `2222`
