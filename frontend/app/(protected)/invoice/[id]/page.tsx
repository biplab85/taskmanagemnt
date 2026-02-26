'use client';

import { useParams } from 'next/navigation';
import { InvoiceDetailPage } from '@/views/invoice/InvoiceDetailPage';

export default function InvoiceViewPage() {
  const params = useParams();
  return <InvoiceDetailPage id={Number(params.id)} />;
}
