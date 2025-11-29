-- Insert profile for existing user
INSERT INTO public.profiles (id, username)
VALUES (
  '75d1581e-271e-4912-9763-4d9f7bbd6292',
  'lequangvu2210.hue'
)
ON CONFLICT (id) DO NOTHING;