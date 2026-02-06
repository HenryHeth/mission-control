'use client';

import SystemStatusTab from '../components/SystemStatusTab';
import NavWrapper from '../components/NavWrapper';

export default function SystemPage() {
  return (
    <NavWrapper activeTab="system">
      <SystemStatusTab />
    </NavWrapper>
  );
}
