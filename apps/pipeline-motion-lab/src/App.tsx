import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopBar } from "@/components/TopBar";
import { KpiCards } from "@/features/dashboard/KpiCards";
import { OwnerTable } from "@/features/dashboard/OwnerTable";
import { StageChart, WeightedChart } from "@/features/dashboard/StageChart";
import { UpcomingList } from "@/features/dashboard/UpcomingList";
import { Explainer } from "@/features/explainer/Explainer";
import { PipelineTable } from "@/features/table/PipelineTable";

export default function App() {
  return (
    <div className="grid-backdrop flex min-h-dvh flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-3 space-y-3">
            <KpiCards />
            <div className="grid gap-3 lg:grid-cols-2">
              <StageChart />
              <WeightedChart />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <UpcomingList />
              <OwnerTable />
            </div>
          </TabsContent>
          <TabsContent value="data" className="mt-3">
            <PipelineTable />
          </TabsContent>
        </Tabs>
      </main>
      <Explainer />
    </div>
  );
}
