-- Fix search_path for normalize_contract_address function
CREATE OR REPLACE FUNCTION public.normalize_contract_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.contract_address = LOWER(NEW.contract_address);
  RETURN NEW;
END;
$$;