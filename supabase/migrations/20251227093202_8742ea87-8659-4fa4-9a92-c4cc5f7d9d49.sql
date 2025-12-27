-- Assign admin role to quangvu
INSERT INTO public.user_roles (user_id, role)
VALUES ('1b32892d-a9f6-4747-8568-c6189a2f1c43', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;