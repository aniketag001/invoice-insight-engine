import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Invoice, InvoiceLineItem } from '@/types/invoice';
import { toast } from 'sonner';

export function useInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Invoice[];
    },
    enabled: !!user,
  });
}

export function useInvoice(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Invoice;
    },
    enabled: !!user && !!id,
  });
}

export function useInvoiceLineItems(invoiceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoice_line_items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId!);
      if (error) throw error;
      return data as unknown as InvoiceLineItem[];
    },
    enabled: !!user && !!invoiceId,
  });
}

export function useUploadInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('invoices')
        .createSignedUrl(filePath, 3600);

      // Create invoice record
      const { data: invoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          file_path: filePath,
          file_url: urlData?.signedUrl || '',
          file_name: file.name,
          file_type: file.type,
          status: 'processing' as const,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Convert file to base64 for AI processing
      const base64 = await fileToBase64(file);

      // Trigger AI extraction
      const { data: extractionResult, error: fnError } = await supabase.functions.invoke('extract-invoice', {
        body: { 
          invoiceId: invoice.id,
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type,
        },
      });

      if (fnError) {
        // Update status to failed
        await supabase.from('invoices').update({ status: 'failed' as const }).eq('id', invoice.id);
        throw fnError;
      }

      return { invoice, extraction: extractionResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice processed successfully');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      if (invoice.file_path) {
        await supabase.storage.from('invoices').remove([invoice.file_path]);
      }
      const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}
