-- Step 1: Add RLS policy to allow users to update their own custom tokens
CREATE POLICY "Users can update own custom tokens"
ON custom_tokens FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 2: Update all existing CAMLY tokens to have correct decimals
UPDATE custom_tokens 
SET decimals = 3 
WHERE contract_address = '0x0910320181889fefde0bb1ca63962b0a8882e413';