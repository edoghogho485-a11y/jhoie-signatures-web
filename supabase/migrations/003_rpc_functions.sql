-- JHOIE SIGNATURES - Migration 003: Server-Verified RPC Functions
-- Run this third in the Supabase SQL Editor.

-- Helper to generate human-friendly reference codes (internal RPC helper only)
CREATE OR REPLACE FUNCTION public.generate_jhoie_ref(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_suffix text;
BEGIN
  v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  RETURN p_prefix || '-' || to_char(now(), 'YYMMDD') || '-' || v_suffix;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_jhoie_ref(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_jhoie_ref(text) FROM anon, authenticated;

-- 1. Verify Admin Role for Signed-In User
CREATE OR REPLACE FUNCTION public.verify_admin_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('is_admin', false, 'role', 'anonymous');
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_admin', false, 'role', 'none');
  END IF;

  RETURN jsonb_build_object(
    'is_admin', (v_profile.role IN ('admin', 'super_admin') AND v_profile.is_active = true),
    'role', v_profile.role,
    'is_active', v_profile.is_active,
    'email', COALESCE(v_profile.email, ''),
    'full_name', COALESCE(v_profile.full_name, '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_access() TO authenticated;

-- 2. Server-Verified Order Placement RPC
-- Prevents frontend price tampering, prevents fake Paid statuses, enforces valid product options & limits,
-- preserves Made to Order inventory, and atomically checks & decrements stocked items.
CREATE OR REPLACE FUNCTION public.create_verified_order(
  p_customer_name text,
  p_phone_number text,
  p_email text,
  p_delivery_address text,
  p_city_state text,
  p_delivery_notes text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_line_items CONSTANT integer := 50;
  c_max_item_qty CONSTANT integer := 50;
  c_max_total_qty CONSTANT integer := 100;
  c_max_money_ngn CONSTANT numeric := 9999999999.99;

  v_order_id uuid;
  v_ref text;
  v_calc_unit_price numeric;
  v_calc_line_total numeric;
  v_calc_subtotal numeric := 0;
  v_subtotal numeric(12, 2) := 0;
  v_total_qty integer := 0;
  v_clean_name text;
  v_clean_phone text;
  v_clean_phone_digits text;
  v_clean_email text;
  v_clean_address text;
  v_clean_city_state text;
  v_clean_notes text;
  v_prod_id uuid;
  v_requested_total integer;
  v_prod public.products%ROWTYPE;
  v_item jsonb;
  v_qty integer;
  v_unit_price numeric(12, 2);
  v_line_total numeric(12, 2);
  v_next_stock integer;
  v_next_status text;
  v_validated_items jsonb := '[]'::jsonb;
  v_inserted_items jsonb := '[]'::jsonb;
  v_item_id uuid;
  v_raw_pid text;
  v_raw_qty text;
  v_raw_size text;
  v_raw_color text;
  v_resolved_size text;
  v_resolved_color text;
  v_has_sizes boolean;
  v_has_colors boolean;
BEGIN
  v_clean_name := btrim(COALESCE(p_customer_name, ''));
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RAISE EXCEPTION 'Please enter your full name (2 to 120 characters).';
  END IF;

  v_clean_phone := btrim(COALESCE(p_phone_number, ''));
  v_clean_phone_digits := regexp_replace(v_clean_phone, '\D', '', 'g');
  IF char_length(v_clean_phone) > 30
     OR v_clean_phone !~ '^\+?[\d\s\-()]+$'
     OR char_length(v_clean_phone_digits) < 10
     OR char_length(v_clean_phone_digits) > 15 THEN
    RAISE EXCEPTION 'Please enter a valid phone or WhatsApp number with 10 to 15 digits.';
  END IF;

  v_clean_email := NULLIF(btrim(COALESCE(p_email, '')), '');
  IF v_clean_email IS NOT NULL
     AND (char_length(v_clean_email) > 254 OR v_clean_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address or leave this field blank.';
  END IF;

  v_clean_address := btrim(COALESCE(p_delivery_address, ''));
  IF char_length(v_clean_address) < 5 OR char_length(v_clean_address) > 500 THEN
    RAISE EXCEPTION 'Please enter your delivery street address (5 to 500 characters).';
  END IF;

  v_clean_city_state := btrim(COALESCE(p_city_state, ''));
  IF char_length(v_clean_city_state) < 2 OR char_length(v_clean_city_state) > 120 THEN
    RAISE EXCEPTION 'Please enter your city and state (2 to 120 characters).';
  END IF;

  v_clean_notes := NULLIF(btrim(COALESCE(p_delivery_notes, '')), '');
  IF v_clean_notes IS NOT NULL AND char_length(v_clean_notes) > 1000 THEN
    RAISE EXCEPTION 'Delivery notes must not exceed 1000 characters.';
  END IF;

  -- Check array type strictly before calling jsonb_array_length()
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Order items must be provided as a valid JSON array.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your shopping bag is empty.';
  END IF;

  IF jsonb_array_length(p_items) > c_max_line_items THEN
    RAISE EXCEPTION 'An order can contain at most % line items.', c_max_line_items;
  END IF;

  -- Strictly validate every item object, UUID, positive whole-number quantity, and order quantity bounds
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF v_item IS NULL OR jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Each order item must be a valid JSON object.';
    END IF;

    IF (v_item ? 'product_id') AND jsonb_typeof(v_item -> 'product_id') <> 'string' THEN
      RAISE EXCEPTION 'Each order item must reference a valid product ID.';
    END IF;

    v_raw_pid := btrim(COALESCE(v_item ->> 'product_id', ''));
    IF v_raw_pid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Each order item must reference a valid product ID.';
    END IF;

    IF NOT (v_item ? 'quantity')
       OR jsonb_typeof(v_item -> 'quantity') NOT IN ('number', 'string') THEN
      RAISE EXCEPTION 'Each order item must specify a valid positive whole-number quantity.';
    END IF;

    v_raw_qty := btrim(COALESCE(v_item ->> 'quantity', ''));
    IF v_raw_qty !~ '^[0-9]+$' OR char_length(v_raw_qty) > 4 THEN
      RAISE EXCEPTION 'Each order item must specify a valid whole-number quantity between 1 and %.',
        c_max_item_qty;
    END IF;

    v_qty := v_raw_qty::integer;
    IF v_qty < 1 OR v_qty > c_max_item_qty THEN
      RAISE EXCEPTION 'Quantity per line item must be between 1 and %.', c_max_item_qty;
    END IF;

    IF (v_item ? 'selected_size')
       AND jsonb_typeof(v_item -> 'selected_size') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION 'Invalid size selection format.';
    END IF;

    IF (v_item ? 'selected_color')
       AND jsonb_typeof(v_item -> 'selected_color') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION 'Invalid colour selection format.';
    END IF;

    v_total_qty := v_total_qty + v_qty;
    IF v_total_qty > c_max_total_qty THEN
      RAISE EXCEPTION 'Total order quantity cannot exceed % units per order.', c_max_total_qty;
    END IF;
  END LOOP;

  -- Lock products in deterministic order and verify aggregated stock quantities across variants
  FOR v_prod_id, v_requested_total IN
    SELECT
      (elem ->> 'product_id')::uuid AS pid,
      SUM(btrim(elem ->> 'quantity')::integer)::integer AS total_qty
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem ->> 'product_id')::uuid
    ORDER BY (elem ->> 'product_id')::uuid
  LOOP
    SELECT *
    INTO v_prod
    FROM public.products
    WHERE id = v_prod_id
      AND is_published = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the items in your bag is no longer available in our catalogue.';
    END IF;

    IF v_prod.stock_status = 'Out of Stock' THEN
      RAISE EXCEPTION '"%" is currently Out of Stock. Please remove it from your bag.', v_prod.name;
    END IF;

    IF v_prod.stock_status <> 'Made to Order' AND v_prod.stock_quantity < v_requested_total THEN
      RAISE EXCEPTION 'Only % unit(s) of "%" are currently in stock (you requested %).',
        v_prod.stock_quantity, v_prod.name, v_requested_total;
    END IF;
  END LOOP;

  -- Validate selected sizes & colours against locked database records and compute authoritative subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item ->> 'product_id')::uuid;
    v_qty := btrim(v_item ->> 'quantity')::integer;
    v_raw_size := NULLIF(btrim(COALESCE(v_item ->> 'selected_size', '')), '');
    v_raw_color := NULLIF(btrim(COALESCE(v_item ->> 'selected_color', '')), '');

    SELECT * INTO v_prod FROM public.products WHERE id = v_prod_id;

    v_has_sizes := EXISTS (
      SELECT 1
      FROM unnest(COALESCE(v_prod.sizes, '{}'::text[])) AS s
      WHERE NULLIF(btrim(s), '') IS NOT NULL
    );
    IF v_has_sizes THEN
      SELECT NULLIF(btrim(s), '')
      INTO v_resolved_size
      FROM unnest(v_prod.sizes) AS s
      WHERE NULLIF(btrim(s), '') IS NOT NULL
        AND btrim(s) = COALESCE(v_raw_size, '')
      LIMIT 1;

      IF v_resolved_size IS NULL THEN
        RAISE EXCEPTION 'Selected size "%" is not available for "%".',
          COALESCE(v_raw_size, ''), v_prod.name;
      END IF;
    ELSE
      IF v_raw_size IS NULL OR v_raw_size = 'Standard' THEN
        v_resolved_size := 'Standard';
      ELSIF v_raw_size = 'M' THEN
        v_resolved_size := 'M';
      ELSE
        RAISE EXCEPTION 'Selected size "%" is not supported for "%".', v_raw_size, v_prod.name;
      END IF;
    END IF;

    v_has_colors := false;
    v_resolved_color := NULL;

    IF v_prod.colors IS NOT NULL AND jsonb_typeof(v_prod.colors) = 'array' THEN
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_prod.colors) AS c
        WHERE jsonb_typeof(c) = 'object'
          AND (c ? 'name')
          AND jsonb_typeof(c -> 'name') = 'string'
          AND NULLIF(btrim(c ->> 'name'), '') IS NOT NULL
      )
      INTO v_has_colors;
    END IF;

    IF v_has_colors THEN
      SELECT NULLIF(btrim(c ->> 'name'), '')
      INTO v_resolved_color
      FROM jsonb_array_elements(v_prod.colors) AS c
      WHERE jsonb_typeof(c) = 'object'
        AND (c ? 'name')
        AND jsonb_typeof(c -> 'name') = 'string'
        AND NULLIF(btrim(c ->> 'name'), '') IS NOT NULL
        AND btrim(c ->> 'name') = COALESCE(v_raw_color, '')
      LIMIT 1;

      IF v_resolved_color IS NULL THEN
        RAISE EXCEPTION 'Selected colour "%" is not available for "%".',
          COALESCE(v_raw_color, ''), v_prod.name;
      END IF;
    ELSE
      IF v_raw_color IS NULL OR v_raw_color IN ('Default', 'Studio Default') THEN
        v_resolved_color := 'Default';
      ELSE
        RAISE EXCEPTION 'Selected colour "%" is not supported for "%".', v_raw_color, v_prod.name;
      END IF;
    END IF;

    v_calc_unit_price := v_prod.price_ngn;
    IF v_calc_unit_price <= 0 OR v_calc_unit_price > c_max_money_ngn THEN
      RAISE EXCEPTION 'Product "%" has an invalid price and cannot be ordered right now.', v_prod.name;
    END IF;

    v_calc_line_total := v_calc_unit_price * v_qty;
    IF v_calc_line_total > c_max_money_ngn THEN
      RAISE EXCEPTION 'The line total for "%" exceeds the maximum supported order amount.', v_prod.name;
    END IF;

    IF v_calc_subtotal + v_calc_line_total > c_max_money_ngn THEN
      RAISE EXCEPTION 'Your order total exceeds the maximum supported order amount.';
    END IF;

    v_unit_price := v_calc_unit_price;
    v_line_total := v_calc_line_total;
    v_calc_subtotal := v_calc_subtotal + v_calc_line_total;
    v_subtotal := v_calc_subtotal;

    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod.id,
        'product_name', v_prod.name,
        'category', v_prod.category,
        'product_image', COALESCE(v_prod.images[1], ''),
        'selected_size', v_resolved_size,
        'selected_color', v_resolved_color,
        'unit_price_ngn', v_unit_price,
        'quantity', v_qty,
        'line_total_ngn', v_line_total
      )
    );
  END LOOP;

  v_ref := public.generate_jhoie_ref('JS-ORD');

  -- Force initial New & Unpaid status regardless of any client values
  INSERT INTO public.orders (
    reference_code,
    customer_id,
    customer_name,
    phone_number,
    email,
    delivery_address,
    city_state,
    delivery_notes,
    subtotal_ngn,
    delivery_fee_ngn,
    total_amount_ngn,
    status,
    payment_status,
    is_demo
  ) VALUES (
    v_ref,
    auth.uid(),
    v_clean_name,
    v_clean_phone,
    v_clean_email,
    v_clean_address,
    v_clean_city_state,
    v_clean_notes,
    v_subtotal,
    0,
    v_subtotal,
    'New',
    'Unpaid',
    false
  )
  RETURNING id INTO v_order_id;

  -- Insert authoritative order_items rows from validated snapshots
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_validated_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      category,
      product_image,
      selected_size,
      selected_color,
      unit_price_ngn,
      quantity,
      line_total_ngn
    ) VALUES (
      v_order_id,
      (v_item ->> 'product_id')::uuid,
      v_item ->> 'product_name',
      v_item ->> 'category',
      v_item ->> 'product_image',
      v_item ->> 'selected_size',
      v_item ->> 'selected_color',
      (v_item ->> 'unit_price_ngn')::numeric(12, 2),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'line_total_ngn')::numeric(12, 2)
    )
    RETURNING id INTO v_item_id;

    v_inserted_items := v_inserted_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_item_id,
        'productId', (v_item ->> 'product_id')::uuid,
        'name', v_item ->> 'product_name',
        'category', v_item ->> 'category',
        'image', v_item ->> 'product_image',
        'priceNgn', (v_item ->> 'unit_price_ngn')::numeric(12, 2),
        'selectedSize', v_item ->> 'selected_size',
        'selectedColor', v_item ->> 'selected_color',
        'quantity', (v_item ->> 'quantity')::integer
      )
    );
  END LOOP;

  -- Decrement stock atomically for ordinary stocked products; preserve Made to Order untouched
  FOR v_prod_id, v_requested_total IN
    SELECT
      (elem ->> 'product_id')::uuid AS pid,
      SUM((elem ->> 'quantity')::integer)::integer AS total_qty
    FROM jsonb_array_elements(v_validated_items) AS elem
    GROUP BY (elem ->> 'product_id')::uuid
  LOOP
    SELECT * INTO v_prod FROM public.products WHERE id = v_prod_id;

    IF v_prod.stock_status = 'Made to Order' THEN
      CONTINUE;
    END IF;

    IF v_prod.stock_quantity < v_requested_total THEN
      RAISE EXCEPTION 'Only % unit(s) of "%" are currently in stock (you requested %).',
        v_prod.stock_quantity, v_prod.name, v_requested_total;
    END IF;

    v_next_stock := v_prod.stock_quantity - v_requested_total;
    IF v_next_stock = 0 THEN
      v_next_status := 'Out of Stock';
    ELSIF v_next_stock <= 2 THEN
      v_next_status := 'Low Stock';
    ELSE
      v_next_status := v_prod.stock_status;
    END IF;

    UPDATE public.products
    SET stock_quantity = v_next_stock,
        stock_status = v_next_status
    WHERE id = v_prod_id;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'referenceCode', v_ref,
    'customerName', v_clean_name,
    'phoneNumber', v_clean_phone,
    'email', v_clean_email,
    'deliveryAddress', v_clean_address,
    'cityState', v_clean_city_state,
    'deliveryNotes', v_clean_notes,
    'items', v_inserted_items,
    'subtotalNgn', v_subtotal,
    'deliveryFeeNgn', 0,
    'totalAmountNgn', v_subtotal,
    'status', 'New',
    'paymentStatus', 'Unpaid',
    'createdAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_verified_order(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_verified_order(text, text, text, text, text, text, jsonb) TO anon, authenticated;

-- 3. Custom Tailoring Request Submission RPC
CREATE OR REPLACE FUNCTION public.submit_custom_order(
  p_customer_name text,
  p_contact_number text,
  p_email text,
  p_outfit_type text,
  p_outfit_description text,
  p_preferred_fabric text,
  p_preferred_color text,
  p_preferred_occasion text,
  p_preferred_delivery_date date,
  p_budget_ngn numeric,
  p_standard_size_reference text,
  p_measurement_unit text,
  p_measurements jsonb,
  p_additional_notes text,
  p_reference_image_name text,
  p_reference_image_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_ref text;
  v_clean_name text;
  v_clean_phone text;
  v_clean_phone_digits text;
  v_clean_email text;
  v_clean_outfit_type text;
  v_clean_description text;
  v_clean_fabric text;
  v_clean_color text;
  v_clean_occasion text;
  v_clean_size_ref text;
  v_clean_unit text;
  v_clean_notes text;
  v_clean_img_name text;
  v_clean_img_path text;
  v_measurement_key text;
  v_measurement_val text;
  v_measurement_suffix text;
  v_measurement_num numeric;
  v_has_any_measurement boolean := false;
  v_has_standard_size boolean := false;
  v_clean_measurements jsonb := '{}'::jsonb;
  v_meas_notes text := '';
BEGIN
  v_clean_name := btrim(COALESCE(p_customer_name, ''));
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RAISE EXCEPTION 'Please enter your full name (2 to 120 characters).';
  END IF;

  v_clean_phone := btrim(COALESCE(p_contact_number, ''));
  v_clean_phone_digits := regexp_replace(v_clean_phone, '\D', '', 'g');
  IF char_length(v_clean_phone) > 30
     OR v_clean_phone !~ '^\+?[\d\s\-()]+$'
     OR char_length(v_clean_phone_digits) < 10
     OR char_length(v_clean_phone_digits) > 15 THEN
    RAISE EXCEPTION 'Please enter a valid WhatsApp phone number with 10 to 15 digits.';
  END IF;

  v_clean_email := NULLIF(btrim(COALESCE(p_email, '')), '');
  IF v_clean_email IS NOT NULL
     AND (char_length(v_clean_email) > 254 OR v_clean_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address or leave this field blank.';
  END IF;

  v_clean_outfit_type := btrim(COALESCE(p_outfit_type, ''));
  IF v_clean_outfit_type NOT IN ('Dress', 'Gown', 'Two-Piece', 'Traditional Outfit', 'Other') THEN
    RAISE EXCEPTION 'Please select a valid outfit type.';
  END IF;

  v_clean_description := btrim(COALESCE(p_outfit_description, ''));
  IF char_length(v_clean_description) < 10 OR char_length(v_clean_description) > 2000 THEN
    RAISE EXCEPTION 'Please provide a clear outfit description (10 to 2000 characters).';
  END IF;

  v_clean_fabric := NULLIF(btrim(COALESCE(p_preferred_fabric, '')), '');
  IF v_clean_fabric IS NOT NULL AND char_length(v_clean_fabric) > 200 THEN
    RAISE EXCEPTION 'Preferred fabric must not exceed 200 characters.';
  END IF;

  v_clean_color := btrim(COALESCE(p_preferred_color, ''));
  IF char_length(v_clean_color) < 1 OR char_length(v_clean_color) > 120 THEN
    RAISE EXCEPTION 'Please specify your preferred colour (1 to 120 characters).';
  END IF;

  v_clean_occasion := NULLIF(btrim(COALESCE(p_preferred_occasion, '')), '');
  IF v_clean_occasion IS NOT NULL AND char_length(v_clean_occasion) > 160 THEN
    RAISE EXCEPTION 'Preferred occasion must not exceed 160 characters.';
  END IF;

  IF p_preferred_delivery_date IS NULL OR p_preferred_delivery_date < current_date THEN
    RAISE EXCEPTION 'Preferred delivery date cannot be in the past.';
  END IF;

  IF p_preferred_delivery_date > (current_date + interval '2 years')::date THEN
    RAISE EXCEPTION 'Preferred delivery date must be within the next 2 years.';
  END IF;

  IF p_budget_ngn IS NOT NULL AND (p_budget_ngn <= 0 OR p_budget_ngn > 100000000) THEN
    RAISE EXCEPTION 'Estimated budget must be greater than 0 and at most 100,000,000 NGN.';
  END IF;

  v_clean_size_ref := NULLIF(btrim(COALESCE(p_standard_size_reference, '')), '');
  IF v_clean_size_ref IS NOT NULL AND char_length(v_clean_size_ref) > 40 THEN
    RAISE EXCEPTION 'Standard size reference must not exceed 40 characters.';
  END IF;
  v_has_standard_size := v_clean_size_ref IS NOT NULL AND v_clean_size_ref <> 'Exact Measurements';

  v_clean_unit := COALESCE(NULLIF(lower(btrim(COALESCE(p_measurement_unit, ''))), ''), 'inches');
  IF v_clean_unit NOT IN ('inches', 'cm') THEN
    RAISE EXCEPTION 'Measurement unit must be either inches or cm.';
  END IF;

  v_clean_notes := NULLIF(btrim(COALESCE(p_additional_notes, '')), '');
  IF v_clean_notes IS NOT NULL AND char_length(v_clean_notes) > 1000 THEN
    RAISE EXCEPTION 'Additional notes must not exceed 1000 characters.';
  END IF;

  IF p_measurements IS NOT NULL THEN
    IF jsonb_typeof(p_measurements) <> 'object' THEN
      RAISE EXCEPTION 'Measurements must be provided as a valid JSON object.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(p_measurements) AS k
      WHERE k NOT IN ('bust', 'waist', 'hips', 'shoulder', 'length', 'notes')
    ) THEN
      RAISE EXCEPTION 'Measurements payload contains unsupported fields.';
    END IF;

    FOREACH v_measurement_key IN ARRAY ARRAY['bust', 'waist', 'hips', 'shoulder', 'length']
    LOOP
      IF (p_measurements ? v_measurement_key)
         AND jsonb_typeof(p_measurements -> v_measurement_key) NOT IN ('string', 'number', 'null') THEN
        RAISE EXCEPTION 'Each body measurement value must be text or a number.';
      END IF;

      v_measurement_val := btrim(COALESCE(p_measurements ->> v_measurement_key, ''));
      IF v_measurement_val <> '' THEN
        IF char_length(v_measurement_val) > 32
           OR v_measurement_val !~* '^[0-9]{1,3}(\.[0-9]{1,2})?(\s*("|in|inch|inches|cm))?$' THEN
          RAISE EXCEPTION 'Please enter a valid positive number for your % measurement.',
            v_measurement_key;
        END IF;

        v_measurement_suffix := NULLIF(
          btrim(substring(lower(v_measurement_val) FROM '("|in|inch|inches|cm)$')),
          ''
        );
        IF v_measurement_suffix IS NOT NULL THEN
          IF v_clean_unit = 'inches' AND v_measurement_suffix = 'cm' THEN
            RAISE EXCEPTION 'The % measurement (%) uses cm, which contradicts the selected unit (inches).',
              v_measurement_key, v_measurement_val;
          ELSIF v_clean_unit = 'cm' AND v_measurement_suffix IN ('"', 'in', 'inch', 'inches') THEN
            RAISE EXCEPTION 'The % measurement (%) uses inches, which contradicts the selected unit (cm).',
              v_measurement_key, v_measurement_val;
          END IF;
        END IF;

        v_measurement_num := regexp_replace(v_measurement_val, '[^0-9.].*$', '')::numeric;
        IF (v_clean_unit = 'inches' AND (v_measurement_num < 3 OR v_measurement_num > 120))
           OR (v_clean_unit = 'cm' AND (v_measurement_num < 8 OR v_measurement_num > 300)) THEN
          RAISE EXCEPTION 'The % measurement (%) is outside a realistic range for %.',
            v_measurement_key, v_measurement_val, v_clean_unit;
        END IF;

        v_has_any_measurement := true;
      END IF;

      v_clean_measurements := v_clean_measurements || jsonb_build_object(
        v_measurement_key, v_measurement_val
      );
    END LOOP;

    IF (p_measurements ? 'notes')
       AND jsonb_typeof(p_measurements -> 'notes') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION 'Measurement notes must be text.';
    END IF;

    v_meas_notes := btrim(COALESCE(p_measurements ->> 'notes', ''));
    IF char_length(v_meas_notes) > 1000 THEN
      RAISE EXCEPTION 'Measurement notes must not exceed 1000 characters.';
    END IF;

    v_clean_measurements := v_clean_measurements || jsonb_build_object('notes', v_meas_notes);
  END IF;

  IF NOT v_has_standard_size AND NOT v_has_any_measurement THEN
    RAISE EXCEPTION 'Please provide at least one body measurement or select a standard reference size.';
  END IF;

  v_clean_img_name := NULLIF(btrim(COALESCE(p_reference_image_name, '')), '');
  IF v_clean_img_name IS NOT NULL AND char_length(v_clean_img_name) > 255 THEN
    RAISE EXCEPTION 'Reference image filename is too long.';
  END IF;

  v_clean_img_path := NULLIF(btrim(COALESCE(p_reference_image_path, '')), '');
  IF v_clean_img_path IS NOT NULL
     AND (char_length(v_clean_img_path) > 255
          OR v_clean_img_path !~* '^requests/[a-z0-9_-]+\.(jpg|jpeg|png|webp)$') THEN
    RAISE EXCEPTION 'Invalid reference image storage path.';
  END IF;

  v_ref := public.generate_jhoie_ref('JS-FIT');

  INSERT INTO public.custom_orders (
    reference_code,
    customer_id,
    customer_name,
    contact_number,
    email,
    outfit_type,
    outfit_description,
    preferred_fabric,
    preferred_color,
    preferred_occasion,
    preferred_delivery_date,
    budget_ngn,
    standard_size_reference,
    measurement_unit,
    measurements,
    additional_notes,
    reference_image_name,
    reference_image_path,
    status
  ) VALUES (
    v_ref,
    auth.uid(),
    v_clean_name,
    v_clean_phone,
    v_clean_email,
    v_clean_outfit_type,
    v_clean_description,
    v_clean_fabric,
    v_clean_color,
    v_clean_occasion,
    p_preferred_delivery_date,
    p_budget_ngn,
    v_clean_size_ref,
    v_clean_unit,
    v_clean_measurements,
    v_clean_notes,
    v_clean_img_name,
    v_clean_img_path,
    'New Request'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'referenceCode', v_ref,
    'status', 'New Request',
    'createdAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_custom_order(
  text, text, text, text, text, text, text, text, date, numeric, text, text, jsonb, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_custom_order(
  text, text, text, text, text, text, text, text, date, numeric, text, text, jsonb, text, text, text
) TO anon, authenticated;

-- 4. Contact Inquiry Submission RPC
CREATE OR REPLACE FUNCTION public.submit_contact_inquiry(
  p_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_clean_name text;
  v_clean_email text;
  v_clean_phone text;
  v_clean_phone_digits text;
  v_clean_subject text;
  v_clean_message text;
BEGIN
  v_clean_name := btrim(COALESCE(p_name, ''));
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RAISE EXCEPTION 'Please enter your name (2 to 120 characters).';
  END IF;

  v_clean_email := btrim(COALESCE(p_email, ''));
  IF char_length(v_clean_email) > 254 OR v_clean_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;

  v_clean_phone := NULLIF(btrim(COALESCE(p_phone, '')), '');
  IF v_clean_phone IS NOT NULL THEN
    v_clean_phone_digits := regexp_replace(v_clean_phone, '\D', '', 'g');
    IF char_length(v_clean_phone) > 30
       OR v_clean_phone !~ '^\+?[\d\s\-()]+$'
       OR char_length(v_clean_phone_digits) < 10
       OR char_length(v_clean_phone_digits) > 15 THEN
      RAISE EXCEPTION 'Please enter a valid phone number with 10 to 15 digits, or leave it blank.';
    END IF;
  END IF;

  v_clean_subject := btrim(COALESCE(p_subject, ''));
  IF char_length(v_clean_subject) < 2 OR char_length(v_clean_subject) > 200 THEN
    RAISE EXCEPTION 'Please enter an enquiry subject (2 to 200 characters).';
  END IF;

  v_clean_message := btrim(COALESCE(p_message, ''));
  IF char_length(v_clean_message) < 10 OR char_length(v_clean_message) > 3000 THEN
    RAISE EXCEPTION 'Please enter a message between 10 and 3000 characters.';
  END IF;

  INSERT INTO public.contact_inquiries (
    customer_id,
    name,
    email,
    phone,
    subject,
    message,
    status
  ) VALUES (
    auth.uid(),
    v_clean_name,
    v_clean_email,
    v_clean_phone,
    v_clean_subject,
    v_clean_message,
    'Unread'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'status', 'Unread',
    'createdAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contact_inquiry(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_inquiry(text, text, text, text, text) TO anon, authenticated;

-- 5. Safe Admin Product Deletion RPC (blocks deletion if active orders reference the product)
CREATE OR REPLACE FUNCTION public.delete_product_safely(p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_product_id uuid;
  v_active_order_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator permissions required to delete products.';
  END IF;

  IF p_product_id IS NULL THEN
    RETURN false;
  END IF;

  -- Lock target product row first to serialize cleanly with create_verified_order()
  SELECT id
  INTO v_locked_product_id
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT COUNT(*)
  INTO v_active_order_count
  FROM public.order_items oi
  INNER JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id = v_locked_product_id
    AND o.status NOT IN ('Completed', 'Cancelled');

  IF v_active_order_count > 0 THEN
    RAISE EXCEPTION 'This product is part of % active order(s). Mark it as "Out of Stock" or archive it instead of deleting while orders are open.', v_active_order_count;
  END IF;

  DELETE FROM public.products WHERE id = v_locked_product_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_product_safely(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_product_safely(uuid) TO authenticated;
