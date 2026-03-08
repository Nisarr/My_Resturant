import { motion } from 'framer-motion';
import { Search, Mail, Phone, Star, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCustomers } from '@/hooks/useSupabaseData';

const CustomersPage = () => {
  const [search, setSearch] = useState('');
  const { data: customers, loading } = useCustomers();
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">{customers.length} registered customers</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">Since {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-xs text-muted-foreground">Visits</p>
                    <p className="font-bold text-sm">{c.visit_count}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-xs text-muted-foreground">Spent</p>
                    <p className="font-bold text-sm">${Number(c.total_spent).toFixed(0)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="font-bold text-sm text-primary">{c.loyalty_points}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</div>}
                  {c.last_visit && <div className="flex items-center gap-1.5"><Star className="h-3 w-3" />Last visit: {new Date(c.last_visit).toLocaleDateString()}</div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && !loading && (
          <p className="col-span-full text-center text-muted-foreground py-10">No customers found</p>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
