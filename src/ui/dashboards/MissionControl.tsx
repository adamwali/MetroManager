import { Inbox } from '@ui/components/Inbox';
import { NewsRail } from '@ui/components/NewsRail';
import { WhatsComing } from '@ui/components/WhatsComing';

/**
 * Mission Control home dashboard. Per design doc §4. The top strip with
 * KPIs lives in AppLayout (always visible across all routes). This page
 * surfaces the priority inbox, what's coming, and recent activity.
 */
export function MissionControl() {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Inbox />
        <WhatsComing />
      </div>
      <div className="flex flex-col gap-4">
        <NewsRail />
      </div>
    </div>
  );
}
