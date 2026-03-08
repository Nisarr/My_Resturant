import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Printer, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useInvoices, useOrders } from '@/hooks/useSupabaseData';
import jsPDF from 'jspdf';

const RESTAURANT = {
  name: 'RestoCafe',
  tagline: 'Fine Dining & Coffee',
  address: '123 Restaurant Ave, Suite 100',
  city: 'San Francisco, CA 94102',
  phone: '(555) 123-4567',
  email: 'hello@restocafe.com',
  website: 'www.restocafe.com',
  taxId: 'TAX-2024-00891',
  logoUrl: '/logo-restocafe.png',
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

interface InvoiceForDisplay {
  id: string;
  customer_name: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  paid: boolean;
  created_at: string;
  items: { id: string; menu_item_name: string; quantity: number; unit_price: number }[];
}

async function generateReceiptPDF(invoice: InvoiceForDisplay) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
  const w = 80;
  let y = 6;
  const lm = 5;
  const rm = w - 5;

  try {
    const img = await loadImage(RESTAURANT.logoUrl);
    const logoW = 22;
    const logoH = (img.height / img.width) * logoW;
    doc.addImage(img, 'PNG', (w - logoW) / 2, y, logoW, logoH);
    y += logoH + 2;
  } catch { y += 2; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(RESTAURANT.name, w / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text(RESTAURANT.tagline, w / 2, y, { align: 'center' });
  y += 3;
  doc.text(RESTAURANT.address, w / 2, y, { align: 'center' });
  y += 3;
  doc.text(`${RESTAURANT.city} · ${RESTAURANT.phone}`, w / 2, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(180);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(lm, y, rm, y);
  y += 4;

  doc.setTextColor(60);
  doc.setFontSize(7);
  doc.text(`Invoice #${invoice.id.slice(-4)}`, lm, y);
  doc.text(new Date(invoice.created_at).toLocaleString(), rm, y, { align: 'right' });
  y += 3.5;
  doc.text(`Customer: ${invoice.customer_name || 'Walk-in'}`, lm, y);
  doc.text(`Payment: ${invoice.payment_method.toUpperCase()}`, rm, y, { align: 'right' });
  y += 4;

  doc.line(lm, y, rm, y);
  y += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(80);
  doc.text('ITEM', lm, y);
  doc.text('QTY', 50, y, { align: 'center' });
  doc.text('AMOUNT', rm, y, { align: 'right' });
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);

  invoice.items.forEach(item => {
    const name = item.menu_item_name.length > 22 ? item.menu_item_name.slice(0, 21) + '…' : item.menu_item_name;
    doc.text(name, lm, y);
    doc.text(`${item.quantity}`, 50, y, { align: 'center' });
    doc.text(`$${(item.quantity * Number(item.unit_price)).toFixed(2)}`, rm, y, { align: 'right' });
    y += 3.5;
  });

  y += 1;
  doc.line(lm, y, rm, y);
  y += 4;

  doc.setFontSize(7);
  doc.setTextColor(80);
  doc.text('Subtotal', lm, y);
  doc.text(`$${Number(invoice.subtotal).toFixed(2)}`, rm, y, { align: 'right' });
  y += 3.5;
  doc.text('Tax', lm, y);
  doc.text(`$${Number(invoice.tax).toFixed(2)}`, rm, y, { align: 'right' });
  y += 3.5;
  if (Number(invoice.discount) > 0) {
    doc.text('Discount', lm, y);
    doc.text(`-$${Number(invoice.discount).toFixed(2)}`, rm, y, { align: 'right' });
    y += 3.5;
  }
  doc.line(lm, y, rm, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text('TOTAL', lm, y);
  doc.text(`$${Number(invoice.total).toFixed(2)}`, rm, y, { align: 'right' });
  y += 6;

  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(180);
  doc.line(lm, y, rm, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(120);
  doc.text('Thank you for dining with us!', w / 2, y, { align: 'center' });
  y += 3;
  doc.text(`${RESTAURANT.website} · ${RESTAURANT.email}`, w / 2, y, { align: 'center' });
  y += 3;
  doc.text(`Tax ID: ${RESTAURANT.taxId}`, w / 2, y, { align: 'center' });

  const pageHeight = y + 6;
  (doc as any).internal.pageSize.height = pageHeight;
  doc.save(`receipt-${invoice.id.slice(-4)}.pdf`);
}

const InvoicesPage = () => {
  const { data: invoices, loading: invLoading } = useInvoices();
  const { orders, loading: ordLoading } = useOrders();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Build display invoices from DB invoices + order items
  const displayInvoices: InvoiceForDisplay[] = invoices.map(inv => {
    const order = orders.find(o => o.id === inv.order_id);
    return {
      ...inv,
      items: order?.items.map(i => ({ id: i.id, menu_item_name: i.menu_item_name, quantity: i.quantity, unit_price: Number(i.unit_price) })) || [],
    };
  });

  const selected = displayInvoices.find(i => i.id === selectedId) || null;

  const handlePrint = () => window.print();
  const handleExportPDF = useCallback(() => {
    if (selected) generateReceiptPDF(selected);
  }, [selected]);

  if (invLoading || ordLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground text-sm mt-1">{invoices.length} invoices</p>
      </div>

      {invoices.length === 0 && <p className="text-center text-muted-foreground py-10">No invoices yet. Complete an order to generate one.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayInvoices.map((inv, i) => (
          <motion.div key={inv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedId(inv.id)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">#{inv.id.slice(-4)}</span>
                  </div>
                  <Badge variant={inv.paid ? 'default' : 'destructive'} className="text-xs">
                    {inv.paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{inv.customer_name || 'Walk-in'}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{inv.items.length} items</span>
                  <span className="font-bold">${Number(inv.total).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice #{selected?.id.slice(-4)}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4" id="receipt">
              <div className="text-center space-y-1">
                <img src={RESTAURANT.logoUrl} alt="RestoCafe" className="h-12 mx-auto" />
                <h3 className="font-bold text-lg">{RESTAURANT.name}</h3>
                <p className="text-[11px] text-muted-foreground">{RESTAURANT.tagline}</p>
                <p className="text-xs text-muted-foreground">{RESTAURANT.address} · {RESTAURANT.phone}</p>
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                {selected.items.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}× {item.menu_item_name}</span>
                    <span>${(item.quantity * Number(item.unit_price)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>${Number(selected.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>${Number(selected.tax).toFixed(2)}</span></div>
                {Number(selected.discount) > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>-${Number(selected.discount).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>${Number(selected.total).toFixed(2)}</span></div>
              </div>
              <Separator />
              <div className="text-center space-y-0.5">
                <p className="text-xs text-muted-foreground">Payment: {selected.payment_method} · {new Date(selected.created_at).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground italic">Thank you for dining with us!</p>
                <p className="text-[10px] text-muted-foreground">{RESTAURANT.website} · Tax ID: {RESTAURANT.taxId}</p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
                <Button className="flex-1" onClick={handleExportPDF}><Download className="h-4 w-4 mr-1" /> Export PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;
