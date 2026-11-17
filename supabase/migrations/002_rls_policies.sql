-- JHOIE SIGNATURES - Migration 002: Row Level Security (RLS) & Admin Role Verification
-- Run this second in the Supabase SQL Editor.

-- Server-side admin check helper (SECURITY DEFINER avoids infinite recursion on profiles RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Strict super_admin check helper for privileged role & activation management
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Enable RLS on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES RLS
DROP POLICY IF EXISTS "Profiles: users read own profile or admin reads all" ON public.profiles;
CREATE POLICY "Profiles: users read own profile or admin reads all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Defense-in-depth trigger preventing privilege escalation or ID tampering by client sessions.
-- Allows direct SQL Editor / postgres superuser operations (where auth.uid() IS NULL) for initial admin promotion.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Profile ID cannot be changed.';
    END IF;

    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active)
       AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Only super_admin accounts can change user roles or activation status.';
    END IF;

    IF OLD.role IN ('admin', 'super_admin')
       AND OLD.id <> auth.uid()
       AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Only super_admin accounts can modify administrator profiles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privilege_escalation();

DROP POLICY IF EXISTS "Profiles: users update own safe fields or admin updates" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users update own safe fields or super_admin manages all" ON public.profiles;
CREATE POLICY "Profiles: users update own safe fields or super_admin manages all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR (public.is_admin() AND role = 'customer')
  )
  WITH CHECK (
    public.is_super_admin()
    OR id = auth.uid()
    OR (public.is_admin() AND role = 'customer')
  );

-- 2. PRODUCTS RLS
DROP POLICY IF EXISTS "Products: public reads published products or admin reads all" ON public.products;
CREATE POLICY "Products: public reads published products or admin reads all"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Products: admins insert products" ON public.products;
CREATE POLICY "Products: admins insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Products: admins update products" ON public.products;
CREATE POLICY "Products: admins update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Products: admins delete products" ON public.products;
CREATE POLICY "Products: admins delete products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3. ORDERS RLS (Public inserts go strictly through create_verified_order RPC; admin-only reads protect PII & internal_notes)
DROP POLICY IF EXISTS "Orders: customers read own orders or admin reads all" ON public.orders;
DROP POLICY IF EXISTS "Orders: admins read all" ON public.orders;
CREATE POLICY "Orders: admins read all"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Orders: admins manage orders" ON public.orders;
CREATE POLICY "Orders: admins manage orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Orders: admins delete orders" ON public.orders;
CREATE POLICY "Orders: admins delete orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. ORDER ITEMS RLS
DROP POLICY IF EXISTS "Order items: customers read own or admin reads all" ON public.order_items;
DROP POLICY IF EXISTS "Order items: admins read all" ON public.order_items;
CREATE POLICY "Order items: admins read all"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Order items: admins manage order items" ON public.order_items;
CREATE POLICY "Order items: admins manage order items"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. CUSTOM ORDERS RLS (Public inserts go strictly through submit_custom_order RPC; admin-only reads protect PII & internal_notes)
DROP POLICY IF EXISTS "Custom orders: customers read own or admin reads all" ON public.custom_orders;
DROP POLICY IF EXISTS "Custom orders: admins read all" ON public.custom_orders;
CREATE POLICY "Custom orders: admins read all"
  ON public.custom_orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Custom orders: admins update requests" ON public.custom_orders;
CREATE POLICY "Custom orders: admins update requests"
  ON public.custom_orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Custom orders: admins delete requests" ON public.custom_orders;
CREATE POLICY "Custom orders: admins delete requests"
  ON public.custom_orders
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 6. CONTACT INQUIRIES RLS (Public inserts go strictly through submit_contact_inquiry RPC)
DROP POLICY IF EXISTS "Enquiries: admins read all" ON public.contact_inquiries;
CREATE POLICY "Enquiries: admins read all"
  ON public.contact_inquiries
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Enquiries: admins update" ON public.contact_inquiries;
CREATE POLICY "Enquiries: admins update"
  ON public.contact_inquiries
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Enquiries: admins delete" ON public.contact_inquiries;
CREATE POLICY "Enquiries: admins delete"
  ON public.contact_inquiries
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 7. WEBSITE SETTINGS RLS
DROP POLICY IF EXISTS "Website settings: public read" ON public.website_settings;
CREATE POLICY "Website settings: public read"
  ON public.website_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Website settings: admins update" ON public.website_settings;
CREATE POLICY "Website settings: admins update"
  ON public.website_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Website settings: admins insert" ON public.website_settings;
CREATE POLICY "Website settings: admins insert"
  ON public.website_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
