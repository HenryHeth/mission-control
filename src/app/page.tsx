'use client';

import DashboardTab from './components/DashboardTab';
import NavWrapper from './components/NavWrapper';

export default function Home() {
  return (
    <NavWrapper activeTab="dashboard">
      <DashboardTab />
    </NavWrapper>
  );
}
