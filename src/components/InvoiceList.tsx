import { useState } from 'react';
import { useInvoices, useDeleteInvoice } from '@/hooks/useInvoices';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, Trash2, Search, Loader2, AlertCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/invoice';
import InvoiceDetail from './InvoiceDetail';

const statusConfig: Record<string, { label: string; className: string }> = {
  uploading: { label: 'Uploading', className: 'bg-muted text-muted-foreground' },
  processing: { label: 'Processing', className: 'bg-warning/10 text-warning border-warning/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function InvoiceList() {
  const { data: invoices, isLoading, error } = useInvoices();
  const deleteMutation = useDeleteInvoice();
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'total_amount' | 'vendor_name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (selectedInvoice) {
    return <InvoiceDetail invoice={selectedInvoice} onBack={() => setSelectedInvoice(null)} />;
  }

  const filtered = (invoices || [])
    .filter((inv) => {
      const q = search.toLowerCase();
      return !q || 
        inv.vendor_name?.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.file_name?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;
      if (sortField === 'created_at') { aVal = a.created_at; bVal = b.created_at; }
      if (sortField === 'total_amount') { aVal = a.total_amount || 0; bVal = b.total_amount || 0; }
      if (sortField === 'vendor_name') { aVal = a.vendor_name || ''; bVal = b.vendor_name || ''; }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
          <p className="text-muted-foreground mt-1">{invoices?.length || 0} total invoices processed</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by vendor, number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/5 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p>Failed to load invoices</p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No invoices yet</h3>
          <p className="text-muted-foreground mt-1">Upload your first invoice to get started</p>
        </div>
      )}

      {filtered.length > 0 && (
        <Card className="overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">File</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('vendor_name')}>
                    <span className="flex items-center gap-1">Vendor <SortIcon field="vendor_name" /></span>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice #</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('total_amount')}>
                    <span className="flex items-center gap-1">Amount <SortIcon field="total_amount" /></span>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Confidence</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                    <span className="flex items-center gap-1">Date <SortIcon field="created_at" /></span>
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const status = statusConfig[inv.status] || statusConfig.processing;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground truncate max-w-[150px]">{inv.file_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{inv.vendor_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{inv.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {inv.total_amount != null ? `${inv.currency} ${Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-xs', status.className)}>
                          {status.label}
                        </Badge>
                        {inv.is_duplicate && (
                          <Badge variant="outline" className="ml-1 text-xs bg-warning/10 text-warning border-warning/20">
                            <Copy className="w-3 h-3 mr-1" />Duplicate
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {inv.confidence_score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  Number(inv.confidence_score) >= 0.8 ? 'bg-success' :
                                  Number(inv.confidence_score) >= 0.5 ? 'bg-warning' : 'bg-destructive'
                                )}
                                style={{ width: `${Number(inv.confidence_score) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {(Number(inv.confidence_score) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(inv); }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
