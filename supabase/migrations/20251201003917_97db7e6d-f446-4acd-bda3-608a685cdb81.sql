-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create treasury_alerts table
CREATE TABLE public.treasury_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.treasury_alerts ENABLE ROW LEVEL SECURITY;

-- Create treasury_snapshots table
CREATE TABLE public.treasury_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_bnb numeric NOT NULL,
  balance_camly numeric NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE public.treasury_snapshots ENABLE ROW LEVEL SECURITY;

-- Create admin_settings table
CREATE TABLE public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('treasury_low_balance_threshold', '{"bnb": 0.05, "camly": 1000000}'),
  ('large_transaction_threshold', '{"camly": 500000}'),
  ('alert_webhook_url', '""'),
  ('alert_email', '""');

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for treasury_alerts
CREATE POLICY "Admins can view alerts"
  ON public.treasury_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts"
  ON public.treasury_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update alerts"
  ON public.treasury_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for treasury_snapshots
CREATE POLICY "Admins can view snapshots"
  ON public.treasury_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert snapshots"
  ON public.treasury_snapshots FOR INSERT
  WITH CHECK (true);

-- RLS Policies for admin_settings
CREATE POLICY "Admins can view settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
  ON public.admin_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));