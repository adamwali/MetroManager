import { Inbox } from '@ui/components/Inbox';
import { NewsRail } from '@ui/components/NewsRail';
import { WhatsComing } from '@ui/components/WhatsComing';
import { QuarterRecap } from '@ui/components/QuarterRecap';
import { StandingOrdersPanel } from '@ui/components/StandingOrdersPanel';
import { CashFlowForecast } from '@ui/components/CashFlowForecast';
import { StrategicPriority } from '@ui/components/StrategicPriority';
import { TrajectoryStrip } from '@ui/components/TrajectoryStrip';
import { TuneOperationsCard } from '@ui/components/TuneOperationsCard';

/**
 * Mission Control home dashboard. Per design doc §4. The top strip with
 * KPIs lives in AppLayout (always visible across all routes). This page
 * surfaces the priority inbox, what's coming, quarter recap, standing
 * orders, and recent activity.
 */
export function MissionControl() {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <StrategicPriority />
        <TrajectoryStrip />
        <Inbox />
        <QuarterRecap />
        <WhatsComing />
      </div>
      <div className="flex flex-col gap-4">
        <CashFlowForecast />
        <TuneOperationsCard />
        <StandingOrdersPanel />
        <NewsRail />
      </div>
    </div>
  );
}
