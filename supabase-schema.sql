-- ========================================================
-- GastroPOS Supabase Database Schema (Updated & Aligned)
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda
-- Project: https://bvnykakdzxmivsdfouuc.supabase.co
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

-- 2. Table: products (Katalog Menu)
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

-- 6. Table: orders (Transaksi Penjualan)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    table_number TEXT,
    order_type TEXT NOT NULL DEFAULT 'dine_in',
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- 7. Table: order_items (Detail Item Transaksi)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    qty INTEGER NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ========================================================
-- 8. Kebijakan Row Level Security (RLS) untuk Akses Penuh
-- ========================================================
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Public full access products" ON public.products;
DROP POLICY IF EXISTS "Public full access ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Public full access product_recipes" ON public.product_recipes;
DROP POLICY IF EXISTS "Public full access staff" ON public.staff;
DROP POLICY IF EXISTS "Public full access orders" ON public.orders;
DROP POLICY IF EXISTS "Public full access order_items" ON public.order_items;

CREATE POLICY "Public full access restaurant_settings" ON public.restaurant_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access ingredients" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access product_recipes" ON public.product_recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
