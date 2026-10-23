-- Yeni gün sayacı 1'den başlayınca eski PAKET-01..N ile çakışıp
-- "order_number allocation failed" veriyordu.
-- Tenant geneli MAX(last_value)+1 taban; tam orders taraması yok.

CREATE OR REPLACE FUNCTION public.next_order_number_for_row(p_row public.orders)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text;
  v_business_date date;
  v_branch_key uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_next integer;
  v_floor integer;
  v_pad int;
  v_candidate text;
  v_attempt int := 0;
  v_max_attempts int := 64;
BEGIN
  IF p_row.order_subtype = 'gel_al' THEN
    v_prefix := 'GELAL';
  ELSIF p_row.order_type IN ('takeaway', 'delivery') THEN
    v_prefix := 'PAKET';
  ELSE
    v_prefix := 'SIP';
  END IF;

  v_business_date := public.compute_business_date(COALESCE(p_row.created_at, now()), p_row.branch_id);

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_row.tenant_id::text || ':' || v_prefix, 0)
  );

  SELECT COALESCE(MAX(last_value), 0)
  INTO v_floor
  FROM public.order_daily_counters
  WHERE tenant_id = p_row.tenant_id
    AND seq_prefix = v_prefix;

  v_next := v_floor + 1;

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'order_number allocation failed after % attempts', v_max_attempts;
    END IF;

    v_pad := GREATEST(2, length(v_next::text));
    v_candidate := v_prefix || '-' || lpad(v_next::text, v_pad, '0');

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.tenant_id = p_row.tenant_id
        AND o.order_number = v_candidate
    );

    v_next := v_next + 1;
  END LOOP;

  INSERT INTO public.order_daily_counters (tenant_id, branch_key, business_date, seq_prefix, last_value)
  VALUES (p_row.tenant_id, v_branch_key, v_business_date, v_prefix, v_next)
  ON CONFLICT (tenant_id, branch_key, business_date, seq_prefix)
  DO UPDATE SET
    last_value = GREATEST(public.order_daily_counters.last_value, EXCLUDED.last_value),
    updated_at = now();

  RETURN v_candidate;
END;
$$;

COMMENT ON FUNCTION public.next_order_number_for_row(public.orders) IS
  'PAKET/GELAL/SIP: tenant geneli counter floor +1 (yeni günde 1 e dusmez).';
