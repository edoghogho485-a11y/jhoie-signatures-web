-- JHOIE SIGNATURES - Migration 001: Initial Relational Schema
-- Run this first in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automatic updated_at timestamp trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. Customer & Admin Profiles (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'super_admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role_active
  ON public.profiles (role, is_active);

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Automatically provision a customer profile on Supabase Auth user creation.
-- Admin promotion is performed explicitly by database administrators, never from client metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'customer',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Products Catalogue (Nigerian Naira pricing)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(btrim(name)) >= 2),
  is_sample boolean NOT NULL DEFAULT false,
  category text NOT NULL CHECK (
    category IN ('Dresses', 'Gowns', 'Two-Piece Outfits', 'Traditional Wear', 'Modern Styles')
  ),
  price_ngn numeric(12, 2) NOT NULL CHECK (price_ngn > 0),
  description text NOT NULL CHECK (char_length(btrim(description)) >= 10),
  fabric_and_care text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}'::text[],
  sizes text[] NOT NULL DEFAULT '{}'::text[],
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_status text NOT NULL DEFAULT 'In Stock' CHECK (
    stock_status IN ('In Stock', 'Low Stock', 'Made to Order', 'Out of Stock')
  ),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_featured boolean NOT NULL DEFAULT false,
  is_new_arrival boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_published_category
  ON public.products (is_published, category);
CREATE INDEX IF NOT EXISTS idx_products_featured
  ON public.products (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON public.products (created_at DESC);

DROP TRIGGER IF EXISTS trg_products_set_updated_at ON public.products;
CREATE TRIGGER trg_products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Customer Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) >= 2),
  phone_number text NOT NULL CHECK (char_length(regexp_replace(phone_number, '\D', '', 'g')) BETWEEN 10 AND 15),
  email text,
  delivery_address text NOT NULL CHECK (char_length(btrim(delivery_address)) >= 5),
  city_state text NOT NULL CHECK (char_length(btrim(city_state)) >= 2),
  delivery_notes text,
  subtotal_ngn numeric(12, 2) NOT NULL CHECK (subtotal_ngn >= 0),
  delivery_fee_ngn numeric(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee_ngn >= 0),
  total_amount_ngn numeric(12, 2) NOT NULL CHECK (total_amount_ngn >= 0),
  status text NOT NULL DEFAULT 'New' CHECK (
    status IN ('New', 'Pending', 'Confirmed', 'Processing', 'Ready', 'Completed', 'Cancelled')
  ),
  payment_status text NOT NULL DEFAULT 'Unpaid' CHECK (
    payment_status IN ('Unpaid', 'Awaiting Confirmation', 'Partially Paid', 'Paid', 'Refunded')
  ),
  internal_notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON public.orders;
CREATE TRIGGER trg_orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Order Line Items (snapshots preserve historical prices & titles even if product changes)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  product_image text NOT NULL DEFAULT '',
  selected_size text NOT NULL,
  selected_color text NOT NULL,
  unit_price_ngn numeric(12, 2) NOT NULL CHECK (unit_price_ngn > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_ngn numeric(12, 2) NOT NULL CHECK (line_total_ngn >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- 5. Custom Tailoring / Made-to-Measure Requests
CREATE TABLE IF NOT EXISTS public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) >= 2),
  contact_number text NOT NULL CHECK (char_length(regexp_replace(contact_number, '\D', '', 'g')) BETWEEN 10 AND 15),
  email text,
  outfit_type text NOT NULL CHECK (
    outfit_type IN ('Dress', 'Gown', 'Two-Piece', 'Traditional Outfit', 'Other')
  ),
  outfit_description text NOT NULL CHECK (char_length(btrim(outfit_description)) >= 10),
  preferred_fabric text,
  preferred_color text NOT NULL CHECK (char_length(btrim(preferred_color)) >= 1),
  preferred_occasion text,
  preferred_delivery_date date NOT NULL,
  budget_ngn numeric(12, 2) CHECK (budget_ngn IS NULL OR budget_ngn > 0),
  standard_size_reference text,
  measurement_unit text NOT NULL DEFAULT 'inches' CHECK (measurement_unit IN ('inches', 'cm')),
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  additional_notes text,
  reference_image_name text,
  reference_image_path text,
  status text NOT NULL DEFAULT 'New Request' CHECK (
    status IN (
      'New Request',
      'Under Review',
      'Awaiting Customer Response',
      'Accepted',
      'In Progress',
      'Completed',
      'Declined'
    )
  ),
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_orders_customer_id ON public.custom_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status_created ON public.custom_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_orders_delivery_date ON public.custom_orders (preferred_delivery_date);

DROP TRIGGER IF EXISTS trg_custom_orders_set_updated_at ON public.custom_orders;
CREATE TRIGGER trg_custom_orders_set_updated_at
  BEFORE UPDATE ON public.custom_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. Customer Contact Enquiries
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) >= 2),
  email text NOT NULL CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text,
  subject text NOT NULL CHECK (char_length(btrim(subject)) >= 2),
  message text NOT NULL CHECK (char_length(btrim(message)) >= 10),
  status text NOT NULL DEFAULT 'Unread' CHECK (status IN ('Unread', 'Read', 'Replied')),
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status_created
  ON public.contact_inquiries (status, created_at DESC);

DROP TRIGGER IF EXISTS trg_contact_inquiries_set_updated_at ON public.contact_inquiries;
CREATE TRIGGER trg_contact_inquiries_set_updated_at
  BEFORE UPDATE ON public.contact_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 7. Single-row Website Settings
CREATE TABLE IF NOT EXISTS public.website_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name text NOT NULL DEFAULT 'JHOIE SIGNATURES',
  tagline text NOT NULL DEFAULT 'Let''s talk fashion....',
  whatsapp_number_raw text NOT NULL DEFAULT '2348000000000',
  whatsapp_display_label text NOT NULL DEFAULT '+234 800 000 0000 (Placeholder — update in Settings)',
  whatsapp_is_placeholder boolean NOT NULL DEFAULT true,
  business_email text NOT NULL DEFAULT 'studio@jhoiesignatures.example',
  business_phone text NOT NULL DEFAULT '+234 800 000 0000 (Placeholder — update in Settings)',
  instagram_handle text NOT NULL DEFAULT '@jhoiesignatures',
  instagram_url text NOT NULL DEFAULT 'https://www.instagram.com/jhoiesignatures/',
  business_location text NOT NULL DEFAULT 'Lagos, Nigeria (Studio address pending update)',
  business_hours text NOT NULL DEFAULT 'Monday – Saturday · By Appointment & Online Concierge',
  currency_code text NOT NULL DEFAULT 'NGN',
  currency_symbol text NOT NULL DEFAULT '₦',
  currency_label text NOT NULL DEFAULT 'Nigerian naira (₦)',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.website_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_website_settings_set_updated_at ON public.website_settings;
CREATE TRIGGER trg_website_settings_set_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
