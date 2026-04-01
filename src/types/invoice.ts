export type InvoiceStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface Invoice {
  id: string;
  user_id: string;
  vendor_name: string | null;
  normalized_vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  currency: string;
  tax_amount: number | null;
  subtotal: number | null;
  status: InvoiceStatus;
  confidence_score: number | null;
  raw_text: string | null;
  structured_data: Record<string, unknown> | null;
  file_path: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  format_hash: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  created_at: string;
}

export interface VendorAnalytics {
  vendor_name: string;
  total_spend: number;
  invoice_count: number;
  currency: string;
}

export interface MonthlySpend {
  month: string;
  total: number;
  count: number;
}
