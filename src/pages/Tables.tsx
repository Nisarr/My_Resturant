import { FloorPlan } from '@/components/tables/FloorPlan';

const TablesPage = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Tables</h1>
        <p className="text-muted-foreground text-sm mt-1">Visual floor plan — tap a table to manage it</p>
      </div>
      <FloorPlan />
    </div>
  );
};

export default TablesPage;
