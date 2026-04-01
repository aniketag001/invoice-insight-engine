import { useInvoiceLineItems } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Calendar, Building2, Hash, DollarSign, Loader2 } from 'lucide-react';
import type { Invoice } from '@/types/invoice';
import { cn } from '@/lib/utils';

interface InvoiceDetailProps {
  invoice: Invoice;
  onBack: () => void;
}

export default function InvoiceDetail({ invoice, onBack }: InvoiceDetailProps) {
  const { data: lineItems, isLoading } = useInvoiceLineItems(invoice.id);

  const fields = [
    { icon: Building2, label: 'Vendor', value: invoice.vendor_name },
    { icon: Hash, label: 'Invoice Number', value: invoice.invoice_number },
    { icon: Calendar, label: 'Invoice Date', value: invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : null },
    { icon: Calendar, label: 'Due Date', value: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : null },
    { icon: DollarSign, label: 'Subtotal', value: invoice.subtotal != null ? `${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}` : null },
    { icon: DollarSign, label: 'Tax', value: invoice.tax_amount != null ? `${invoice.currency} ${Number(invoice.tax_amount).toFixed(2)}` : null },
    { icon: DollarSign, label: 'Total', value: invoice.total_amount != null ? `${invoice.currency} ${Number(invoice.total_amount).toFixed(2)}` : null },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{invoice.vendor_name || invoice.file_name || 'Invoice'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn(
              'text-xs',
              invoice.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
              invoice.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' :
              'bg-warning/10 text-warning border-warning/20'
            )}>
              {invoice.status}
            </Badge>
            {invoice.confidence_score != null && (
              <span className="text-xs text-muted-foreground">
                {(Number(invoice.confidence_score) * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extracted fields */}
        <Card className="shadow-card">
          <CardHeader>
            <h3 className="text-lg font-semibold text-foreground">Extracted Data</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => (
              <div key={field.label} className="flex items-start gap-3">
                <field.icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-medium text-foreground">{field.value || '—'}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Line items */}
        <Card className="shadow-card">
          <CardHeader>
            <h3 className="text-lg font-semibold text-foreground">Line Items</h3>
          </CardHeader>
          <CardContent>
            {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />}
            {lineItems && lineItems.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2">Description</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Qty</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Price</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-2 text-sm text-foreground">{item.description || '—'}</td>
                      <td className="py-2 text-sm text-muted-foreground text-right">{item.quantity != null ? Number(item.quantity) : '—'}</td>
                      <td className="py-2 text-sm text-muted-foreground text-right">{item.unit_price != null ? Number(item.unit_price).toFixed(2) : '—'}</td>
                      <td className="py-2 text-sm font-medium text-foreground text-right">{item.amount != null ? Number(item.amount).toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : !isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">No line items extracted</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Raw text */}
      {invoice.raw_text && (
        <Card className="shadow-card">
          <CardHeader>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> Raw Extracted Text
            </h3>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
              {invoice.raw_text}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
