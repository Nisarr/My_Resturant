import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useExpenses, useOrders } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';

const FinancePage = () => {
  const { user } = useAuth();
  const { data: expenses, loading: expLoading, addExpense } = useExpenses();
  const { orders, loading: ordLoading } = useOrders();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: 'Ingredients' });

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalProfit = totalRevenue - totalExpenses;

  const handleAdd = async () => {
    if (!form.description || !form.amount) return;
    await addExpense({
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      date: new Date().toISOString().split('T')[0],
      created_by: user?.id || null,
    });
    setForm({ description: '', amount: '', category: 'Ingredients' });
    setIsOpen(false);
  };

  if (expLoading || ordLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Group expenses by category for chart
  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount); });
  const chartData = Object.entries(catTotals).map(([cat, amount]) => ({ category: cat, amount }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">Income, expenses & profit overview</p>
        </div>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Total Revenue', value: totalRevenue, icon: TrendingUp, color: 'text-primary' },
          { title: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-destructive' },
          { title: 'Net Profit', value: totalProfit, icon: DollarSign, color: 'text-success' },
        ].map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="text-2xl font-bold mt-1">${s.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className={`h-11 w-11 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg font-semibold font-sans">Expenses by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 15%, 88%)" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="amount" fill="hsl(0, 65%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-lg font-semibold font-sans">Recent Expenses</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No expenses recorded yet</p>}
            {expenses.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.category} · {e.date}</p>
                </div>
                <span className="font-semibold text-destructive text-sm">-${Number(e.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Ingredients', 'Payroll', 'Utilities', 'Supplies', 'Maintenance', 'Other'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancePage;
