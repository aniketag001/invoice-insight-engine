import { useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { DollarSign, FileText, Building2, TrendingUp, Loader2 } from 'lucide-react';

const CHART_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(190, 70%, 45%)',
];

export default function Analytics() {
  const { data: invoices, isLoading } = useInvoices();

  const stats = useMemo(() => {
    if (!invoices?.length) return null;

    const completed = invoices.filter((i) => i.status === 'completed');
    const totalSpend = completed.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    
    // Vendor breakdown
    const vendorMap = new Map<string, { total: number; count: number }>();
    completed.forEach((inv) => {
      const name = inv.normalized_vendor_name || inv.vendor_name || 'Unknown';
      const existing = vendorMap.get(name) || { total: 0, count: 0 };
      existing.total += Number(inv.total_amount) || 0;
      existing.count += 1;
      vendorMap.set(name, existing);
    });
    const vendorData = Array.from(vendorMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Monthly trends
    const monthMap = new Map<string, { total: number; count: number }>();
    completed.forEach((inv) => {
      const date = inv.invoice_date || inv.created_at;
      const month = date.substring(0, 7);
      const existing = monthMap.get(month) || { total: 0, count: 0 };
      existing.total += Number(inv.total_amount) || 0;
      existing.count += 1;
      monthMap.set(month, existing);
    });
    const monthlyData = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Currency breakdown
    const currencyMap = new Map<string, number>();
    completed.forEach((inv) => {
      const curr = inv.currency || 'USD';
      currencyMap.set(curr, (currencyMap.get(curr) || 0) + (Number(inv.total_amount) || 0));
    });
    const currencyData = Array.from(currencyMap.entries())
      .map(([currency, total]) => ({ currency, total }));

    // Duplicates
    const duplicates = invoices.filter((i) => i.is_duplicate).length;

    return {
      totalSpend,
      invoiceCount: invoices.length,
      completedCount: completed.length,
      vendorCount: vendorMap.size,
      duplicates,
      avgConfidence: completed.length
        ? completed.reduce((sum, i) => sum + (Number(i.confidence_score) || 0), 0) / completed.length
        : 0,
      vendorData,
      monthlyData,
      currencyData,
    };
  }, [invoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">No analytics data yet</h3>
        <p className="text-muted-foreground mt-1">Upload and process invoices to see insights</p>
      </div>
    );
  }

  const statCards = [
    { icon: DollarSign, label: 'Total Spend', value: `$${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, accent: 'text-success' },
    { icon: FileText, label: 'Invoices Processed', value: stats.completedCount.toString(), accent: 'text-primary' },
    { icon: Building2, label: 'Unique Vendors', value: stats.vendorCount.toString(), accent: 'text-warning' },
    { icon: TrendingUp, label: 'Avg Confidence', value: `${(stats.avgConfidence * 100).toFixed(0)}%`, accent: 'text-primary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground mt-1">Insights from your processed invoices</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.accent} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly spend trend */}
        {stats.monthlyData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground">Monthly Spend Trend</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: 12 }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Spend']}
                  />
                  <Line type="monotone" dataKey="total" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Vendor breakdown */}
        {stats.vendorData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground">Top Vendors by Spend</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.vendorData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: 12 }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Spend']}
                  />
                  <Bar dataKey="total" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Currency breakdown */}
        {stats.currencyData.length > 1 && (
          <Card className="shadow-card">
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground">Currency Distribution</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.currencyData}
                    dataKey="total"
                    nameKey="currency"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ currency, percent }) => `${currency} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {stats.currencyData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: 12 }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
