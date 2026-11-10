-- ========================================================
-- SKRIP LENGKAP & AMAN (ALL-IN-ONE) DATABASE POS RESTORAN
-- Jalankan skrip ini di SQL Editor Supabase Dashboard:
-- https://supabase.com/dashboard/project/bvnykakdzxmivsdfouuc/sql/new
-- ========================================================

-- 1. Table: restaurant_settings (White-label Branding)
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'GEMOELAI',
    tagline TEXT DEFAULT 'Rasa Autentik Nusantara',
    address TEXT DEFAULT 'Jl. Kuliner Nusantara No. 88, Jakarta',
    phone TEXT DEFAULT '0812-3456-7890',
    logo_url TEXT,
    footer_message TEXT DEFAULT 'Terima kasih atas kunjungan Anda',
    tax_percentage NUMERIC(5,2) DEFAULT 10.0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: products (Katalog Menu Lengkap)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    has_variants BOOLEAN DEFAULT false,
    variants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tambah kolom jika tabel dibuat dari versi lama
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- 3. Table: ingredients (Master Bahan Baku Inventori)
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'gram',
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_stock_alert NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table: product_recipes (Resep / Bill of Materials)
CREATE TABLE IF NOT EXISTS public.product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    amount_needed NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_recipes_product ON public.product_recipes(product_id);

-- 5. Table: staff (Karyawan & Akses PIN)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    pin TEXT NOT NULL DEFAULT '1234',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Table: orders (Transaksi Penjualan & Tiket Dapur)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    table_number TEXT,
    customer_name TEXT,
    order_type TEXT NOT NULL DEFAULT 'dine_in',
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    amount_paid NUMERIC(12,2) DEFAULT 0,
    change_amount NUMERIC(12,2) DEFAULT 0,
    kitchen_status TEXT NOT NULL DEFAULT 'pending',
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tambah kolom jika tabel dibuat dari versi lama
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kitchen_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_status ON public.orders(kitchen_status);

-- 7. Table: order_items (Detail Item Transaksi)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT NOT NULL,
    variant_id TEXT,
    variant_name TEXT,
    price NUMERIC(12,2) NOT NULL,
    qty INTEGER NOT NULL,
    subtotal NUMERIC(12,2) DEFAULT 0,
    notes TEXT
);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ========================================================
-- 8. Nonaktifkan Row Level Security (RLS) untuk POS
-- ========================================================
ALTER TABLE public.restaurant_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- ========================================================
-- 9. Daftarkan tabel ke Realtime Publication Supabase
-- ========================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.product_recipes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ========================================================
-- 10. Buat Storage Bucket 'restaurant-assets' & Policy Publik
-- ========================================================
-- Buat bucket penyimpanan foto logo & foto menu jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'restaurant-assets',
    'restaurant-assets',
    true,
    10485760, -- Maksimal 10MB per file
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Beri akses RLS Storage untuk public anon (upload, select, update, delete)
DROP POLICY IF EXISTS "Public Select restaurant-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert restaurant-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Update restaurant-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete restaurant-assets" ON storage.objects;

CREATE POLICY "Public Select restaurant-assets" ON storage.objects
FOR SELECT USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Public Insert restaurant-assets" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'restaurant-assets');

CREATE POLICY "Public Update restaurant-assets" ON storage.objects
FOR UPDATE USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Public Delete restaurant-assets" ON storage.objects
FOR DELETE USING (bucket_id = 'restaurant-assets');
