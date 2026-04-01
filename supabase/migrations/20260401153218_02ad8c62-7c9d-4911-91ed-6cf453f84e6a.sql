
-- Create invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('uploading', 'processing', 'completed', 'failed');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_name TEXT,
  normalized_vendor_name TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  tax_amount NUMERIC(12,2),
  subtotal NUMERIC(12,2),
  status invoice_status NOT NULL DEFAULT 'uploading',
  confidence_score NUMERIC(3,2),
  raw_text TEXT,
  structured_data JSONB,
  file_path TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  format_hash TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of UUID REFERENCES public.invoices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create invoice line items table
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC(10,3),
  unit_price NUMERIC(12,2),
  amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create format templates table
CREATE TABLE public.format_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  pattern_hash TEXT UNIQUE,
  extraction_rules JSONB,
  usage_count INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_templates ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- Line items policies (through invoice ownership)
CREATE POLICY "Users can view own line items" ON public.invoice_line_items FOR SELECT 
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE user_id = auth.uid()));
CREATE POLICY "Users can create own line items" ON public.invoice_line_items FOR INSERT 
  WITH CHECK (invoice_id IN (SELECT id FROM public.invoices WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own line items" ON public.invoice_line_items FOR UPDATE 
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own line items" ON public.invoice_line_items FOR DELETE 
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE user_id = auth.uid()));

-- Format templates policies
CREATE POLICY "Users can view own templates" ON public.format_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own templates" ON public.format_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.format_templates FOR UPDATE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_format_templates_updated_at BEFORE UPDATE ON public.format_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Storage policies
CREATE POLICY "Users can upload own invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own invoices" ON storage.objects FOR DELETE USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_vendor ON public.invoices(normalized_vendor_name);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_format_hash ON public.invoices(format_hash);
CREATE INDEX idx_line_items_invoice ON public.invoice_line_items(invoice_id);
