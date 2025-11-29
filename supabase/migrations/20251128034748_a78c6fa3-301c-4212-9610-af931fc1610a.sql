-- Step 1: Delete duplicate CAMLY tokens (keep one, delete others with same contract address)
DELETE FROM custom_tokens 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, LOWER(contract_address), chain ORDER BY created_at) as rn
    FROM custom_tokens
  ) t 
  WHERE rn > 1
);

-- Step 2: Normalize all existing contract addresses to lowercase
UPDATE custom_tokens
SET contract_address = LOWER(contract_address)
WHERE contract_address != LOWER(contract_address);

-- Step 3: Create trigger function to auto-normalize contract_address
CREATE OR REPLACE FUNCTION normalize_contract_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Automatically convert contract_address to lowercase
  NEW.contract_address = LOWER(NEW.contract_address);
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger on custom_tokens table
DROP TRIGGER IF EXISTS normalize_contract_address_trigger ON custom_tokens;
CREATE TRIGGER normalize_contract_address_trigger
  BEFORE INSERT OR UPDATE ON custom_tokens
  FOR EACH ROW
  EXECUTE FUNCTION normalize_contract_address();

-- Step 5: Add unique constraint to prevent duplicates (user_id + contract_address + chain)
ALTER TABLE custom_tokens
DROP CONSTRAINT IF EXISTS custom_tokens_user_contract_chain_unique;

ALTER TABLE custom_tokens
ADD CONSTRAINT custom_tokens_user_contract_chain_unique
UNIQUE (user_id, contract_address, chain);