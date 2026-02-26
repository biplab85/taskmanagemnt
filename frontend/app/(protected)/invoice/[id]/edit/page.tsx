'use client';

import { useParams } from 'next/navigation';
import { InvoiceFormPage } from '@/views/invoice/InvoiceFormPage';

export default function EditInvoicePage() {
  const params = useParams();
  return <InvoiceFormPage editId={Number(params.id)} />;
}
