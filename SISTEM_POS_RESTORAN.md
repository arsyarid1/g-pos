# 📖 Dokumentasi & Buku Panduan Sistem POS Restoran (Offline-First)

Dokumen ini berfungsi sebagai **arsip arsitektur, panduan teknis, dan pengingat (reminder)** menyeluruh mengenai seluruh sistem, fitur, struktur database, dan alur operasional aplikasi POS (Point of Sale) Restoran berbasis **React + TypeScript + Tailwind CSS + Dexie.js (IndexedDB) + Supabase**.

> ⚠️ **Aturan Pengembang (Developer Rule):**  
> Setiap kali ada penambahan fitur baru atau perubahan logika pada aplikasi ini, dokumen ini **WAJIB** diperbarui pada bagian fitur terkait dan log perubahan versi di akhir dokumen.

---

## 📑 Daftar Isi
1. [Arsitektur & Tech Stack](#1-arsitektur--tech-stack)
2. [Skema Database Lokal (Dexie.js IndexedDB)](#2-skema-database-lokal-dexiejs-indexeddb)
3. [Fitur-Fitur Sistem Kasir POS](#3-fitur-fitur-sistem-kasir-pos)
4. [Fitur-Fitur Back-Office / Admin Dashboard](#4-fitur-fitur-back-office--admin-dashboard)
5. [Engine Sinkronisasi & Inventori Otomatis](#5-engine-sinkronisasi--inventori-otomatis)
6. [Struktur Folder & Komponen Proyek](#6-struktur-folder--komponen-proyek)
7. [Log Pembaruan Fitur (Changelog)](#7-log-pembaruan-fitur-changelog)

---

## 1. Arsitektur & Tech Stack

Aplikasi dirancang dengan pendekatan **Local-First (Offline-First)**:
- **Frontend SPA:** React 18+, TypeScript, Tailwind CSS, Lucide React (ikon).
- **Database Lokal:** `dexie` dan `dexie-react-hooks`. Semua transaksi kasir, katalog produk, bahan baku, dan konfigurasi tersimpan langsung di browser klien (`IndexedDB`). Kasir dapat beroperasi secara penuh tanpa koneksi internet sama sekali.
- **PWA Standalone & Offline Shell:** W3C Web App Manifest (`manifest.json` dengan identitas `id: "/?pos=standalone"`) dan Service Worker kustom (`sw.js`). Dapat di-install langsung ke perangkat (Windows, macOS, Android, iOS) dan berjalan mandiri layaknya software POS kasir desktop tanpa bilah browser.
- **Backend & Cloud Sync:** Supabase (`@supabase/supabase-js`) untuk penyimpanan data master terpusat di cloud dan Cloudflare Pages / Static CDN untuk deployment frontend.
- **Cloud Storage:** Supabase Storage (`product-images` & `restaurant-assets`) untuk upload foto produk dan logo restoran, dilengkapi fallback otomatis ke base64 IndexedDB lokal jika offline.

---

## 2. Skema Database Lokal (Dexie.js IndexedDB)

Database lokal diberi nama `RestaurantPOSDB`.

### Tabel & Indeks:
1. `products`
   - Primary Key: `id` (string UUID)
   - Indeks: `category, is_active, updated_at`
   - Fields: `name, category, price, image_url, description, is_active, has_variants, variants, created_at, updated_at`
   - Sub-struktur `variants`: Array of `ProductVariant` `{ id, name, price, is_default, sku }`
2. `orders`
   - Primary Key: `id` (string UUID)
   - Indeks: `invoice_number, sync_status, created_at`
   - Fields: `invoice_number, order_type, table_number, customer_name, items, subtotal, tax, total, payment_method, amount_paid, change_amount, sync_status, created_at, synced_at`
3. `settings`
   - Primary Key: `id` (`default_settings`)
   - Indeks: `updated_at`
   - Fields: `name, tagline, address, phone, logo_url, receipt_footer, tax_percentage, updated_at`
4. `ingredients` (Bahan Baku / Inventori)
   - Primary Key: `id` (string UUID)
   - Indeks: `name, current_stock, min_stock_alert, updated_at`
   - Fields: `name, unit, current_stock, min_stock_alert, cost_per_unit, updated_at`
5. `recipes` (BOM - Bill of Materials)
   - Primary Key: `id` (string UUID)
   - Indeks: `product_id, ingredient_id`
   - Fields: `product_id, ingredient_id, quantity`
6. `staff`
   - Primary Key: `id` (string UUID)
   - Indeks: `role, pin, is_active`
   - Fields: `name, role ('admin' | 'cashier' | 'kitchen'), pin (4 digit), is_active, created_at`
7. `stock_logs` (Kartu Stok / Stock Opname)
   - Primary Key: `id` (string UUID)
   - Indeks: `ingredient_id, created_at`
   - Fields: `ingredient_id, ingredient_name, type ('in' | 'out' | 'adjustment'), quantity_changed, previous_stock, new_stock, reason, created_at`

---

## 3. Fitur-Fitur Sistem Kasir POS

### A. Layar Kasir Split-Screen
- **Katalog Menu:**
  - Search bar instan dan filter kategori: *All, Makanan, Minuman, Snack, Dessert*.
  - Indikator harga dinamis: Menampilkan *"Mulai dari Rp X.XXX"* untuk menu dengan varian.
  - Badge jumlah opsi varian pada card produk.
- **Modal Pemilihan Varian Cepat (`ProductVariantModal`):**
  - Muncul otomatis saat mengetuk menu bervarian (misal: *Teh Manis, Jeruk Peras, Kopi Susu, Tahu Crispy*).
  - Pilihan varian suhu (*Es / Dingin* vs *Hangat / Panas*), ukuran/kemasan (*Pouch*, *Box Sedang*, *Family Pack*).
  - Stepper kuantitas, input catatan per item (misal: *"Es sedikit, less sugar"*), dan subtotal kalkulasi otomatis.
  - Untuk menu reguler tanpa varian: Tetap 1-klik langsung masuk ke keranjang.
- **Keranjang Pesanan Aktif (`Cart`):**
  - Baris item membedakan produk yang sama dengan varian berbeda (tidak saling menimpa).
  - Tombol Stepper `+` dan `-` responsif.
  - **Tombol Hapus Langsung (`Trash2`):** Memudahkan kasir menghapus baris pesanan tanpa perlu menekan tombol minus berulang kali.
  - Toggle tipe pesanan (*Dine-In* vs *Takeaway*) dan input nomor meja / nama pelanggan.
  - Ringkasan subtotal, PB1 (10% dapat diatur dinamis di admin), dan total akhir.
- **Modal Checkout Cepat (`CheckoutModal`):**
  - Pilihan metode: *Tunai (Cash)*, *QRIS*, *Kartu Debit/EDC*.
  - Tombol pecahan uang pas: Rp 20.000, Rp 50.000, Rp 100.000, dan tombol Uang Pas.
  - Kalkulator otomatis uang kembalian.
- **Struk Pembayaran Thermal 58mm / 80mm (`ReceiptModal`):**
  - Preview struk dengan format rapi dan font monospaced.
  - **Logo Resto Persegi (Square & Tanpa Outline):** Menampilkan logo restoran asli secara proporsional tanpa border lingkaran dan tanpa terpotong.
  - Detail transaksi: Nama resto, alamat, no telp, no invoice, tanggal/waktu, rincian menu + varian, subtotal, PB1, total, metode bayar, kembalian, dan footer terima kasih.
  - Tombol *"Cetak Struk Thermal"* yang memicu `window.print()` dengan CSS `@media print` terisolasi khusus kertas thermal 58mm/80mm.
- **Drawer Riwayat Transaksi & Status Sinkronisasi (`OrderHistoryDrawer`):**
  - Melihat semua order tersimpan di IndexedDB.
  - Filter: *Semua*, *Pending Sync*, *Synced*, *Failed*.
  - Tombol *"Cetak Ulang Struk"* untuk transaksi lama.
  - Tombol manual *"Sync Ulang"* untuk order yang pending/gagal.

---

## 4. Fitur-Fitur Back-Office / Admin Dashboard

Akses ke Admin Dashboard diproteksi dengan modal PIN 4-digit (default PIN Admin: `1234`).

### Navigasi Sidebar Back-Office:
1. **Ringkasan & Penjualan (`AdminOverviewView`)** *(Default Tab)*
   - **Filter Waktu:** *Hari Ini*, *7 Hari Terakhir*, *30 Hari*, *Semua Waktu*.
   - **Kartu Metrik KPI:** Total Omset (Subtotal + PB1), Total Transaksi, Rata-rata Belanja (AOV), Bahan Baku Kritis.
   - **Widget Peringatan Bahan Baku Rendah (Low Stock Alert):** Menampilkan daftar bahan baku yang stok fisiknya `<= min_stock_alert` lengkap dengan progress bar sisa stok dan tombol pintas ke inventori.
   - **Distribusi Pembayaran:** Visualisasi persentase dan nominal omset untuk Tunai, QRIS, dan Kartu Debit.
   - **Top 5 Menu Terlaris:** Menampilkan ranking menu beserta varian dengan jumlah porsi dan kontribusi nominal tertinggi.
   - **Tabel 8 Transaksi Terbaru:** Real-time monitoring pesanan kasir dengan tombol cepat melihat/mencetak struk.
   - **Ekspor Laporan CSV:** Download seluruh data penjualan ke format Excel CSV.
2. **Menu & Resep (BOM) (`MenuManagementView`)**
   - Tambah, edit, dan hapus menu katalog.
   - **Upload Foto Produk:** Langsung unggah file gambar (JPG/PNG/WEBP) dengan kompresi otomatis ke Supabase Storage atau fallback base64 lokal.
   - **Pengaturan Varian Produk:**
     - Toggle: *"Menu ini memiliki Varian / Opsi Suhu / Kemasan Berbeda"*.
     - Preset 1-Klik: *Minuman Es & Hangat*, *Ukuran Botol/Literan*, dan *Kemasan Snack (Pouch, Box, Family)*.
     - Penentuan harga jual per varian dan penetapan varian default.
   - **Resep / BOM (Bill of Materials):** Hubungkan menu dengan bahan baku dan takarannya (misal: 1 porsi Nasi Goreng = 180g beras, 1 butir telur, 20ml minyak).
3. **Inventori Bahan Baku (`InventoryView`)**
   - Master data bahan baku (Satuan: gram, ml, pcs, kg, liter).
   - Penentuan batas minimum stok alert (`min_stock_alert`) dan biaya HPP per unit.
   - **Stock Opname:** Tombol penyesuaian stok masuk (kulakan) atau stok keluar (rusak/susut/koreksi) yang mencatat log mutasi stok ke tabel `stock_logs`.
4. **Staf & Akses PIN (`StaffManagementView`)**
   - Daftar staf dengan role: *Admin*, *Cashier*, *Kitchen*.
   - Pengaturan PIN akses cepat 4-digit untuk autentikasi kasir & admin.
5. **Pengaturan Resto & Brand (`RestaurantSettingsView`)** *(Terletak di bawah Staf & Akses PIN)*
   - Nama resto, Tagline, Alamat, No Telepon/WhatsApp.
   - Upload Logo Restoran (langsung upload file gambar ke Supabase Storage / lokal).
   - Pesan footer struk thermal kasir.
   - Pengaturan persentase Pajak Restoran (PB1 %).

---

## 5. Engine Sinkronisasi & Inventori Otomatis

### A. Pengurangan Bahan Baku Otomatis (`deductIngredientsForOrder`)
File: `src/lib/db.ts`
- Dipanggil setiap kali transaksi berhasil diselesaikan di kasir POS.
- Sistem memeriksa relasi tabel `recipes` untuk setiap menu/item yang terjual.
- Mengalikan takaran resep dengan kuantitas item dan memotong `current_stock` pada tabel `ingredients`.
- Mencatat riwayat mutasi ke `stock_logs` dengan alasan transaksi kasir terkait.

### B. Background Sync Service (`syncService.ts`)
- **Dua Arah:**
  - `pullProducts()`: Mengambil menu terbaru dari Supabase ke IndexedDB.
  - `pushOrders()`: Mengirim transaksi lokal dengan status `pending` ke tabel Supabase `orders` dan `order_items`, lalu mengubah status lokal menjadi `synced`.
  - `syncIngredients()` & `syncRecipes()`: Sinkronisasi master stok dan resep.
- **Otomatisasi:** Terpicu saat event `window.addEventListener('online')` dan polling setiap 30 detik saat online.

---

## 6. Struktur Folder & Komponen Proyek

```text
src/
├── components/
│   ├── admin/
│   │   ├── AdminDashboard.tsx       # Layout Back-Office & Sidebar
│   │   ├── AdminOverviewView.tsx    # Dashboard Analitik Penjualan & Low Stock
│   │   ├── AdminPinModal.tsx        # Modal proteksi PIN 4-digit
│   │   ├── InventoryView.tsx        # Manajemen Stok Bahan Baku & Opname
│   │   ├── MenuManagementView.tsx   # CRUD Menu, BOM, Varian, & Upload Foto
│   │   ├── RestaurantSettingsView.tsx# Konfigurasi White-label & Logo Resto
│   │   └── StaffManagementView.tsx  # Manajemen Staf & PIN Akses
│   ├── auth/
│   │   └── StaffPinModal.tsx        # Modal Otorisasi Multi-Role PIN (Admin/Kasir/Dapur)
│   ├── kitchen/
│   │   └── KitchenDashboard.tsx     # Layar Antrian Masak Dapur (KDS) & Tinjau Stok
│   ├── pos/
│       ├── Cart.tsx                 # Keranjang Pesanan Aktif (+, -, Hapus, Catatan)
│       ├── CheckoutModal.tsx        # Modal Pembayaran Cepat (Cash/QRIS/Card)
│       ├── OrderHistoryDrawer.tsx   # Riwayat Order & Manual Sync
│       ├── ProductGrid.tsx          # Grid Menu & Tabs Kategori
│       ├── ProductVariantModal.tsx  # Modal Pemilihan Varian Suhu & Kemasan
│       ├── ReceiptModal.tsx         # Preview & Cetak Struk Thermal 58mm/80mm
│       └── SyncBadge.tsx            # Indikator Status Online/Offline & Sync
├── hooks/
│   └── useSync.ts                   # Hook reaktif background sync
├── lib/
│   ├── db.ts                        # Definisi Dexie Database, Seed Data & BOM Engine
│   ├── favicon.ts                   # Engine Otomatisasi Favicon & Title Browser
│   ├── supabase.ts                  # Supabase Client & Config Validator
│   └── utils.ts                     # Helper Rupiah, Tanggal Indo, & Formatter
├── services/
│   ├── storageService.ts            # Service Upload Gambar ke Cloud Storage / Base64
│   └── syncService.ts               # Background Sync Engine (Orders & Catalog)
├── types/
│   └── index.ts                     # TypeScript Interfaces Lengkap
├── App.tsx                          # Root Router State (Kasir vs Admin Mode)
└── index.css                        # Tailwind CSS & Print Styling Thermal
```

---

## 7. Log Pembaruan Fitur (Changelog)

### Versi 1.7.0 (Inisialisasi Git & Publikasi ke GitHub Repository)
1. **Inisialisasi & Konfigurasi Git:**
   - Menginisialisasi repositori Git lokal dengan cabang utama `main`.
   - Mengonfigurasi [`.gitignore`](file:///d:/Gemoelai/POS/.gitignore) untuk mengamankan file environment lokal (`.env`, `.env.*`) serta mengabaikan `node_modules` dan `dist`.
   - Menyediakan template environment publik pada [`.env.example`](file:///d:/Gemoelai/POS/.env.example).
2. **Publikasi ke GitHub Remote:**
   - Menghubungkan remote origin ke repositori GitHub: [`https://github.com/arsyarid1/g-pos`](https://github.com/arsyarid1/g-pos).
   - Melakukan commit perdana menyeluruh (*Full suite POS, KDS, PWA, Cloudflare ready, Supabase integration*) dan berhasil push ke branch `main`.
   - Repositori kini siap disambungkan secara langsung ke **Cloudflare Pages** untuk *automated CI/CD deployment*.

### Versi 1.6.2 (Pembersihan Tuntas Cache Demo, Verifikasi Supabase & Kesiapan Cloudflare Pages)
1. **Solusi Mengapa Data Demo Sempat Masih Muncul:**
   - **Penyebab:** Service Worker PWA sebelumnya mencache bundel JavaScript lama di browser. Saat halaman dibuka, browser menjalankan script lama yang masih memuat data template awal.
   - **Solusi PWA:** Mengupgrade Service Worker (`public/sw.js`) ke versi `v2.1` dengan strategi **Network-First**, otomatis menghapus seluruh cache versi lama saat aktivasi.
   - **Solusi Database:** Menambahkan algoritma pembersih agresif `purgeTemplateData()` di [`db.ts`](file:///d:/Gemoelai/POS/src/lib/db.ts) dan [`App.tsx`](file:///d:/Gemoelai/POS/src/App.tsx) yang secara instan menghapus data demo berdasarkan prefix ID (`prod-`, `ing-`, `rec-`) dan nama-nama makanan/minuman demo.
   - **Solusi Manual Admin:** Menambahkan tombol **"Bersihkan Menu & Bahan Demo"** langsung di kartu atas Back-Office Overview ([`AdminOverviewView.tsx`](file:///d:/Gemoelai/POS/src/components/admin/AdminOverviewView.tsx)) untuk mengosongkan menu dan bahan baku seketika dengan 1 klik.
2. **Verifikasi Langsung Koneksi Supabase Cloud:**
   - Menambahkan kartu pemantauan live database Supabase di Back-Office Dashboard dengan tombol **"Tes Koneksi Cloud"** untuk menguji response time ping ke `https://bvnykakdzxmivsdfouuc.supabase.co`.
3. **Kesiapan Penuh Deployment Cloudflare Pages:**
   - Menyediakan [`public/_redirects`](file:///d:/Gemoelai/POS/public/_redirects) (`/* /index.html 200`) untuk dukungan Single Page Application (SPA).
   - Menyediakan [`public/_headers`](file:///d:/Gemoelai/POS/public/_headers) untuk memastikan `sw.js` tidak di-cache oleh Cloudflare edge server.
   - Menyediakan [`.node-version`](file:///d:/Gemoelai/POS/.node-version) (`20`) untuk runtime build Cloudflare Pages.

### Versi 1.6.1 (Pembersihan Data Template Menu & Inventori, Pertahankan Akun Staf)
1. **Penghapusan Seluruh Data Bawaan / Dummy Template:**
   - Menghapus seluruh data bawaan contoh makanan/minuman (`INITIAL_PRODUCTS = []`), bahan baku (`INITIAL_INGREDIENTS = []`), dan resep BOM (`INITIAL_RECIPES = []`).
   - Menjalankan rutinitas `clearTemplateMenuAndInventory()` di [`db.ts`](file:///d:/Gemoelai/POS/src/lib/db.ts) untuk mengosongkan tabel `products`, `ingredients`, `recipes`, dan `stock_logs` di IndexedDB browser klien agar bersih dan siap digunakan untuk data riil restoran.
2. **Proteksi & Pemeliharaan Akun User / Staf:**
   - Seluruh akun staf restoran tetap **dipertahankan utuh**:
     - 👑 **Admin / Owner:** `Bapak Arsyad` (PIN: `1234`)
     - 🛒 **Kasir:** `Budi Santoso` (PIN: `1111`)
     - 🍳 **Dapur / Koki:** `Siti Rahma` (PIN: `2222`)
   - Data konfigurasi restoran ([`GEMOELAI`](file:///d:/Gemoelai/POS/src/lib/db.ts)) tetap aktif.
3. **Penyempurnaan Tampilan Kosong (Empty State UI):**
   - **Layar Kasir POS (`ProductGrid.tsx`):** Menampilkan pesan ramah bahwa menu masih kosong dan mengarahkan Admin untuk menginput produk baru.
   - **Manajemen Menu Admin (`MenuManagementView.tsx`):** Menampilkan ilustrasi dan tombol pintas `+ Tambah Menu Pertama`.
   - **Manajemen Bahan Baku (`InventoryView.tsx`):** Menampilkan panduan pendaftaran master bahan baku baru.

### Versi 1.6.0 (Integrasi Live Cloud Supabase & Storage Bucket Aktif)
1. **Penyambungan Proyek Supabase Resmi:**
   - Menghubungkan aplikasi ke instance cloud Supabase: `https://bvnykakdzxmivsdfouuc.supabase.co`.
   - Mengonfigurasi file `.env` dengan kredensial lengkap:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY`
     - `VITE_SUPABASE_SECRET_KEY` (akses penuh POS untuk bypass RLS dan kelancaran sync)
     - `SUPABASE_JWKS_URL`
2. **Pembuatan & Aktivasi Storage Buckets Cloud:**
   - Menginisialisasi dan membuka akses publik untuk 2 bucket penyimpanan file di Supabase Storage:
     - `restaurant-assets` (untuk logo brand dan aset identitas resto)
     - `product-images` (untuk foto produk katalog menu)
3. **Penyelarasan Skema & Sinkronisasi (`syncService.ts`):**
   - Menyelaraskan field skema database agar kompatibel dengan tabel live Supabase:
     - `restaurant_settings`: sinkronisasi `footer_message` dan `receipt_footer`.
     - `orders`: sinkronisasi `total_amount` dan `payment_status`.
     - `order_items`: sinkronisasi `qty` dan `price`.
     - `product_recipes`: sinkronisasi `amount_needed` dan `quantity`.
   - Menangani ketiadaan tabel opsional secara *graceful* tanpa memblokir siklus sinkronisasi data utama.
4. **Pembaruan File Skema SQL (`supabase-schema.sql`):**
   - Menyediakan skrip referensi DDL dan policy RLS lengkap yang siap dijalankan di SQL Editor dashboard Supabase.

### Versi 1.5.1 (PWA Standalone Lengkap dengan W3C ID & Antarmuka Login Bersih)
1. **Penyempurnaan & Pembersihan Antarmuka Login (`LoginPage.tsx`):**
   - Menghilangkan kartu petunjuk PIN bawaan (Kasir: 1111, Dapur: 2222, Admin: 1234) demi keamanan operasional restoran.
   - Menghilangkan tombol manual "Pasang Aplikasi POS (PWA Standalone)" dari halaman login agar antarmuka login tetap minimalis, bersih, dan profesional. Proses instalasi PWA tetap berjalan otomatis melalui antarmuka native browser (ikon *Install App* di address bar Chrome/Edge atau menu *Add to Home Screen* di Safari/Android).
2. **Implementasi Progressive Web App (PWA) Standalone Penuh:**
   - **Manifest W3C Lengkap (`public/manifest.json`):**
     - Dilengkapi dengan atribut identitas unik `"id": "/?pos=standalone"` sesuai standar W3C Web App Manifest.
     - `"display": "standalone"` dan `"display_override": ["window-controls-overlay", "standalone", "minimal-ui"]` sehingga aplikasi dapat diinstall di desktop (Windows/macOS/Linux) maupun smartphone/tablet (Android/iOS) dan berjalan seperti software desktop native tanpa address bar browser.
     - Konfigurasi warna tema `"theme_color": "#ea580c"` dan latar `"background_color": "#f8fafc"`.
     - Ikon lengkap 192x192 px, 512x512 px (format normal & maskable) dan SVG vektor di direktori `public/icons/`.
     - PWA Shortcuts cepat untuk langsung melompat ke *Kasir POS*, *Layar Dapur*, dan *Back-Office Admin*.
   - **Service Worker Offline Cache (`public/sw.js`):**
     - Cache engine cerdas untuk shell aplikasi (`index.html`, script bundle, CSS, dan icon).
     - Menjamin aplikasi tetap dapat dibuka dan berfungsi 100% normal saat koneksi internet mati total.
   - **PWA Management Helper (`src/lib/pwa.ts` & `src/main.tsx`):**
     - Otomatis mendaftarkan service worker saat aplikasi dimuat.
     - Mendeteksi status standalone (*display-mode: standalone*).
     - Menangani event kesiapan instalasi native (*beforeinstallprompt*) secara seamless di latar belakang.
   - **Meta Header PWA Standalone di `index.html`:**
     - Dukungan penuh iOS Safari Web App (`apple-mobile-web-app-capable`, `apple-touch-icon`).

### Versi 1.5.0 (Halaman Login Sentral, Light Mode Layar Dapur & Minimalisasi Header Kasir)
1. **Halaman Login Sentral Terpadu (`src/components/auth/LoginPage.tsx`):**
   - Aplikasi kini memulai sesi dari **Halaman Login Berbasis PIN** yang berpenampilan profesional dan memuat logo serta nama restoran.
   - **Navigasi Otomatis Berdasarkan PIN:**
     - Memasukkan PIN Kasir (**`1111`**) ➔ Langsung diarahkan ke **Layar Kasir POS**.
     - Memasukkan PIN Dapur (**`2222`**) ➔ Langsung diarahkan ke **Layar Dapur (Kitchen Display System)**.
     - Memasukkan PIN Admin (**`1234`**) ➔ Langsung diarahkan ke **Dashboard Back-Office Admin**.
   - Mendukung input angka melalui layar sentuh (touchscreen) maupun keyboard fisik/numpad komputer.
2. **Layar Dapur (KDS) dalam Tema Terang (Light Mode) (`KitchenDashboard.tsx`):**
   - Seluruh antarmuka tiket antrian masak dapur diubah dari tema gelap menjadi **Light Mode** yang cerah, bersih, berlatar putih/abu-abu terang dengan kartu tiket berbingkai tegas yang serasi dengan layar kasir.
3. **Penyederhanaan & Minimalisasi Header Kasir POS (`App.tsx`):**
   - Menghilangkan bilah navigasi tab (Kasir, Dapur, Admin).
   - Menghilangkan badge koneksi "online" dan badge "Local-First / Local Dexie DB".
   - Menghilangkan tombol "Cek Stok Bahan" (kasir fokus sepenuhnya pada transaksi pelanggan tanpa distraksi).
   - Menyisakan: Logo Resto, Nama Resto, Tombol Riwayat Transaksi (cetak ulang struk), dan Tombol Logout/Keluar ke halaman login.
4. **Pintas Akses Kasir & Dapur di Dashboard Admin (`AdminDashboard.tsx` & `AdminOverviewView.tsx`):**
   - Admin diberikan tombol aksi cepat di bilah navigasi atas:
     - 🛒 **"Kasir POS"** ➔ Langsung membuka layar kasir penjualan.
     - 🍳 **"Layar Dapur"** ➔ Langsung membuka layar antrian tiket dapur.
     - 🔒 **"Keluar"** ➔ Mengunci sesi admin dan kembali ke halaman login.
   - Saat Admin berada di layar Kasir atau Dapur, tersedia tombol **"Kembali ke Admin"** untuk kembali ke Back-Office tanpa perlu memasukkan PIN ulang.

### Versi 1.8.1 (Optimalisasi UI Kasir POS Responsif di Layar Kecil & Tablet)
1. **Mode Tampilan Adaptif Layar Kecil / Tablet (< 1024px) (`App.tsx` & `Cart.tsx`):**
   - Mengatasi masalah katalog menu makanan yang sebelumnya terdesak atau tidak terlihat di layar kecil / tablet portrait karena panel keranjang memakan seluruh layar.
   - **Segmented Tab Switcher di Header:** Kasir di tablet/smartphone dapat beralih antara tab **"Menu Makanan"** dan tab **"Pesanan (X Item)"** dengan mulus.
   - **Floating Bottom Cart Summary Bar:** Saat kasir memilih menu di layar kecil, bilah ringkasan mengambang muncul di bawah layar menampilkan total item dan harga belanja, dilengkapi tombol *"Lihat Pesanan"* untuk beralih ke keranjang.
   - **Tombol Navigasi Cepat di Keranjang:** Menambahkan tombol *"⬅ Menu"* di header keranjang pada layar kecil agar kasir dapat kembali ke daftar menu dengan satu sentuhan.
   - **Dukungan Layar Lebar (Desktop/Laptop):** Tampilan tetap split-screen berdampingan (Menu di kiri, Keranjang di kanan) tanpa mengubah alur kerja kasir desktop.

### Versi 1.8.0 (Sinkronisasi Real-Time Multi-Device Berbasis Supabase WebSocket)
1. **Engine Supabase Realtime Channels (`src/services/syncService.ts`):**
   - Menghubungkan aplikasi ke channel WebSocket Supabase `pos-multi-device-sync`.
   - Setiap perubahan data di satu perangkat (Device 1) langsung memicu broadcast ke semua perangkat lainnya (Device 2, Layar Dapur, Tablet Kasir, Monitor Admin) dalam hitungan milidetik.
   - Tabel yang terhubung secara realtime:
     - `products`: Tambah, ubah harga/nama/foto/varian, atau hapus menu langsung tersinkron seketika.
     - `orders`: Pesanan dari Kasir langsung muncul di Layar Dapur tanpa reload. Perubahan status masak di dapur (`cooking`/`ready`) langsung terupdate di kasir.
     - `ingredients`: Pengurangan stok bahan baku otomatis langsung terpantau di semua perangkat.
     - `restaurant_settings`: Perubahan logo/nama restoran langsung tercermin di semua layar.
2. **Penyelarasan Skema Kolom Supabase (`supabase-schema.sql`):**
   - Menambahkan kolom `image_url`, `description`, `has_variants`, `variants`, `created_at` pada tabel `products`.
   - Menambahkan kolom `customer_name`, `subtotal`, `tax`, `kitchen_status`, `amount_paid`, `change_amount`, `items` (JSONB) pada tabel `orders`.
   - Menambahkan kolom `variant_id`, `variant_name`, `subtotal` pada tabel `order_items`.
   - Mendaftarkan tabel ke publication `supabase_realtime`.

### Versi 1.7.1 (Perbaikan Keamanan Supabase Browser: Mengatasi Error Forbidden Secret API)
1. **Pemisahan Kunci Supabase Browser vs Secret Key (`src/lib/supabase.ts` & `.env`):**
   - Mengatasi error HTTP 403 `forbidden use of secret API` yang muncul saat browser mengirimkan `sb_secret_...` di header API.
   - Sesuai standar arsitektur Supabase, runtime browser (client-side) secara ketat dibatasi hanya menggunakan **Publishable / Anon Key** (`sb_publishable_...`).
   - Membersihkan pemanggilan `VITE_SUPABASE_SECRET_KEY` dari kode Vite client bundle.
2. **Pedoman Akses Row Level Security (RLS) Supabase:**
   - Menyediakan query SQL cepat di `supabase-schema.sql` untuk menonaktifkan atau mengatur izin publik RLS (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY;`) agar sinkronisasi kasir offline-first dapat berjalan tanpa hambatan otentikasi auth pengguna.

### Versi 1.4.1 (Otomatisasi Favicon & Title Browser Berbasis Logo Resto)
1. **Engine Favicon Otomatis (`src/lib/favicon.ts`):**
   - Setiap kali logo restoran diunggah atau diganti (baik dari Cloud Storage maupun IndexedDB lokal), sistem secara otomatis memproses logo tersebut menjadi **Favicon Tab Browser**.
   - Menggunakan pemrosesan HTML5 Canvas 64x64 pixel untuk menjaga proporsi logo tetap persegi tajam (*square without distortion*), bersih tanpa garis tepi, dan transparan.
   - Menggantikan link favicon default secara dinamis (`document.querySelectorAll("link[rel*='icon']")`).
   - Menyinkronkan judul tab browser (*document title*) menjadi `[Nama Restoran] - POS Restoran`.
2. **Reaktivitas Instan di Seluruh Aplikasi:**
   - **Layar Pengaturan Restoran (`RestaurantSettingsView.tsx`):** Saat pengguna memilih file logo baru atau menekan simpan, favicon tab browser langsung berganti seketika (*real-time preview*).
   - **Aplikasi Utama (`App.tsx`):** Mendeteksi `settings.logo_url` dari Dexie secara reaktif, sehingga saat aplikasi dibuka di tab baru atau direfresh, favicon restoran langsung terpasang otomatis.

### Versi 1.4.0 (Role-Based Access Control, Layar Dapur KDS & Hak Akses Inventori)
1. **Otorisasi Multi-Role Berbasis PIN Staf (`StaffPinModal.tsx`):**
   - Menggantikan verifikasi satu arah lama dengan sistem autentikasi peran dinamis.
   - **PIN Bawaan Aktif:**
     - 👑 **Admin (`1234`):** Akses penuh ke seluruh sistem (Back-Office, POS Kasir, Layar Dapur, edit menu, dan satu-satunya role yang dapat mengedit/opname inventori).
     - 🛒 **Kasir (`1111`):** Akses ke POS Kasir dan fitur **"Cek Stok Bahan"** (Read-Only). Dibatasi dari menu Back-Office.
     - 🍳 **Dapur (`2222`):** Langsung masuk ke **Layar Dapur (Kitchen Display System)** dan tab **"Stok Bahan Baku"** (Read-Only).
   - Sinkronisasi otomatis di `ensureDefaultStaff()` sehingga ketiga akun staf bawaan selalu aktif di IndexedDB browser.
2. **Dashboard Pesanan Dapur / Kitchen Display System (`KitchenDashboard.tsx`):**
   - Layar antrian masak interaktif bertema gelap modern (*dark mode*) khusus tim koki/kitchen.
   - Tiket pesanan terbagi berdasarkan status: *Perlu Dimasak*, *Menunggu Dimasak* (`pending`), *Sedang Dimasak* (`cooking`), dan *Siap Saji* (`ready`).
   - Setiap kartu tiket mencantumkan nomor invoice, meja/takeaway, waktu masuk, jumlah porsi tebal, varian (suhu/kemasan), dan catatan khusus pelanggan berwarna kuning mencolok.
   - Tombol alur kerja masak: *"Mulai Masak"* ➔ *"Siap Saji"* ➔ *"Selesai Disajikan"*.
   - Tab terintegrasi **"Stok Bahan Baku"** berstatus Read-Only untuk memantau ketersediaan bahan dapur.
3. **Akses Cek Stok Bahan Baku untuk Kasir POS (`App.tsx` & `InventoryView.tsx`):**
   - Menambahkan tombol **"Cek Stok Bahan"** di bilah navigasi kasir POS.
   - Kasir dapat mencari dan memeriksa sisa bahan secara cepat untuk menjawab pertanyaan pelanggan tanpa meninggalkan antrian kasir.
4. **Proteksi Hak Akses Inventori (Hanya Admin yang Bisa Edit):**
   - Mode `readOnly={true}` diterapkan secara ketat pada tampilan kasir dan dapur: menyembunyikan tombol *"Tambah Bahan Baku"*, tombol *"Edit"*, tombol *"Hapus"*, dan tombol *"Stock Opname"*.
   - Penambahan master bahan dan penyesuaian fisik (*Stock Opname*) hanya terbuka saat login sebagai **Admin** di Back-Office.

### Versi 1.3.1 (Standardisasi Tampilan Logo Bebas Stroke)
1. **Penampilan Logo Tanpa Stroke & Outline di Seluruh Antarmuka:**
   - **Header POS Kasir (`App.tsx`):** Menghilangkan `border border-slate-200` dan `shadow-xs`, menggantikannya dengan `border-0 shadow-none bg-transparent` sehingga logo tampil bersih dan menyatu dengan tata letak.
   - **Struk Thermal / Bon Pembayaran (`ReceiptModal.tsx` & `index.css`):** Memastikan logo tampil dalam format *square* murni tanpa border/outline dan tanpa pemotongan lingkaran (*circle clipping*). Ditambahkan aturan proteksi cetak `@media print` agar mesin cetak thermal tidak menambahkan garis tepi apapun pada gambar logo.
   - **Preview Struk Pengaturan Restoran (`RestaurantSettingsView.tsx`):** Menghapus `rounded-full border border-slate-200` pada preview struk kasir dan thumbnail dropzone upload logo.
   - **Header Back-Office Admin (`AdminDashboard.tsx`):** Menghapus border garis abu-abu pada logo brand di header admin.

### Versi 1.3.0
1. **Admin Overview & Business Analytics Dashboard (`AdminOverviewView.tsx`):**
   - Menambahkan halaman ringkasan penjualan dengan filter rentang waktu (Hari Ini, 7 Hari, 30 Hari, Semua).
   - Metrik omset, jumlah transaksi, AOV, dan distribusi metode bayar (Tunai, QRIS, Card).
   - Widget peringatan bahan baku menipis (*Low Stock Alert*) dengan progress bar sisa stok.
   - Ranking 5 menu terlaris dan tabel 8 transaksi terbaru dengan akses cetak struk langsung.
   - Fitur ekspor rekap transaksi ke file CSV.
2. **Struk Thermal Logo Square Tanpa Outline (`ReceiptModal.tsx`):**
   - Menghapus border lingkaran dan outline pada logo di struk thermal.
   - Mengubah frame logo menjadi square proporsional (`w-16 h-16 object-contain`) agar logo tidak terpotong saat dicetak.
3. **Reposisi Menu Pengaturan di Sidebar Admin:**
   - Memindahkan menu *"Pengaturan Resto & Brand"* agar berada tepat di bawah menu *"Staf & Akses PIN"*.
4. **Perbaikan & Migrasi Varian Menu di Layar POS:**
   - Menambahkan migrasi otomatis pada `ensureDefaultProducts()` sehingga produk bawaan (*Teh Manis, Jeruk Peras, Kopi Susu, Tahu Crispy*) yang tersimpan di IndexedDB browser langsung memiliki data varian lengkap.
   - Mengoptimalkan `ProductGrid.tsx` dan `ProductVariantModal.tsx` agar pop-up pemilihan varian selalu muncul saat menu bervarian diketuk.
5. **Perbaikan Tombol Keranjang Pesanan Aktif (`Cart.tsx`):**
   - Menambahkan tombol hapus langsung (`Trash2`) di setiap baris item keranjang.
   - Menjamin tombol `+` (increment) dan `-` (decrement) bekerja secara instan dengan pencocokan ID komposit yang aman (`item.cartItemId || item.product.id`).
6. **Pembuatan File Dokumentasi & Pengingat (`SISTEM_POS_RESTORAN.md`):**
   - Panduan lengkap mengenai arsitektur, skema database, alur kerja, dan daftar fitur untuk pemeliharaan berkelanjutan.
