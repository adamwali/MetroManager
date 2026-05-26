import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@ui/AppLayout';
import { MissionControl } from '@ui/dashboards/MissionControl';
import { PerformanceBoard } from '@ui/dashboards/PerformanceBoard';
import { TtcOperations } from '@ui/dashboards/TtcOperations';
import { GoOperations } from '@ui/dashboards/GoOperations';
import { UpOperations } from '@ui/dashboards/UpOperations';
import { CapitalProjects } from '@ui/dashboards/CapitalProjects';
import { CapitalAllocation } from '@ui/dashboards/CapitalAllocation';
import { Treasury } from '@ui/dashboards/Treasury';
import { PoliticalAffairs } from '@ui/dashboards/PoliticalAffairs';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: MissionControl },
      { path: 'performance', Component: PerformanceBoard },
      { path: 'ttc', Component: TtcOperations },
      { path: 'go', Component: GoOperations },
      { path: 'up', Component: UpOperations },
      { path: 'capital', Component: CapitalProjects },
      { path: 'allocation', Component: CapitalAllocation },
      { path: 'treasury', Component: Treasury },
      { path: 'political', Component: PoliticalAffairs },
    ],
  },
]);
