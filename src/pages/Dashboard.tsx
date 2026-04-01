import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import FileUpload from '@/components/FileUpload';
import InvoiceList from '@/components/InvoiceList';
import Analytics from '@/components/Analytics';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'upload' && <FileUpload />}
      {activeTab === 'invoices' && <InvoiceList />}
      {activeTab === 'analytics' && <Analytics />}
    </DashboardLayout>
  );
}
