ALTER TABLE public.creative_requests
  ALTER COLUMN format TYPE TEXT USING format::TEXT;

DROP TYPE IF EXISTS public.asset_format_enum;
