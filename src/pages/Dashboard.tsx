import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, TrendingUp, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { TopItemsChart } from '@/components/dashboard/TopItemsChart';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { useOrders, useCustomers } from '@/hooks/useSupabaseData';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const Dashboard = () => {
  const { orders, loading: ordLoading } = useOrders();
  const { data: customers, loading: custLoading } = useCustomers();

  if (ordLoading || custLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
  const avgOrder = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

  // Build daily summary from orders for chart
  const dailyMap: Record<string, { date: string; revenue: number; orders: number; expenses: number; profit: number }> = {};
  orders.forEach(o => {
    const d = o.created_at.split('T')[0];
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, orders: 0, expenses: 0, profit: 0 };
    dailyMap[d].revenue += Number(o.total);
    dailyMap[d].orders += 1;
    dailyMap[d].profit += Number(o.total);
  });
  const dailySummaries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  // Map orders for RecentOrders component (expects old shape)
  const recentForDisplay = orders.slice(0, 5).map(o => ({
    id: o.id,
    status: o.status as any,
    tableNumber: o.table_number ?? undefined,
    customerName: o.customer_name ?? undefined,
    items: o.items.map(i => ({
      id: i.id,
      menuItemId: i.menu_item_id || '',
      menuItemName: i.menu_item_name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
    })),
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    discount: Number(o.discount),
    total: Number(o.total),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  }));

  const stats = [
    { title: "Today's Revenue", value: `$${todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, change: `${todayOrders.length} orders` },
    { title: 'Orders Today', value: todayOrders.length.toString(), icon: ShoppingCart, change: 'today' },
    { title: 'Avg Order Value', value: `$${avgOrder.toFixed(0)}`, icon: TrendingUp, change: 'per order' },
    { title: 'Customers', value: customers.length.toString(), icon: Users, change: 'total' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your restaurant today</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <motion.div key={s.title} variants={item}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.title}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                    <p className="text-xs text-primary mt-1">{s.change}</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} initial="hidden" animate="show" className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold font-sans">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={dailySummaries} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold font-sans">Top Items</CardTitle>
            </CardHeader>
            <CardContent>
              <TopItemsChart />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-sans">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentOrders orders={recentForDisplay} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;
