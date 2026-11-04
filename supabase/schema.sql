CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  country TEXT,
  whatsapp TEXT,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  verification_token_hash TEXT,
  verification_token_expires_at TIMESTAMPTZ,
  password_reset_token_hash TEXT,
  password_reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON public.users (verification_token_hash);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON public.users (password_reset_token_hash);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions (expires_at);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('server', 'mod', 'service')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  location TEXT,
  locations TEXT[] DEFAULT '{}',
  meta TEXT,
  tag TEXT,
  accent TEXT DEFAULT 'slate',
  image_url TEXT,
  image_key TEXT,
  image_content_type TEXT,
  images TEXT[] DEFAULT '{}',
  gallery_images JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  available BOOLEAN DEFAULT true,
  download_key TEXT,
  download_name TEXT,
  download_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_active_type ON public.products (active, type);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC,
  tax_rate NUMERIC,
  tax_amount NUMERIC,
  total NUMERIC,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);

CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events (order_id, created_at);

CREATE TABLE IF NOT EXISTS public.order_messages (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages (order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender_role ON public.order_messages (sender_role, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads (user_id);

CREATE TABLE IF NOT EXISTS public.server_subscriptions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  server_name TEXT NOT NULL,
  monthly_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  reminder_sent_at TIMESTAMPTZ,
  renewal_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_server_subs_user_id ON public.server_subscriptions (user_id, current_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_server_subs_status ON public.server_subscriptions (status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_server_subs_order_id ON public.server_subscriptions (order_id);

CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'store_settings',
  tax_enabled BOOLEAN DEFAULT true,
  tax_rate NUMERIC DEFAULT 2.29,
  sandbox_enabled BOOLEAN DEFAULT true,
  whatsapp_number TEXT DEFAULT '+94 78 890 1407',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.settings (id, tax_enabled, tax_rate, sandbox_enabled, whatsapp_number)
VALUES ('store_settings', true, 2.29, true, '+94 78 890 1407')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_email TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  details TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-files', 'product-files', false)
ON CONFLICT (id) DO NOTHING;
