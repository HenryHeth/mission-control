'use client';

import SpendingTab from '../components/SpendingTab';
import NavWrapper from '../components/NavWrapper';

export default function SpendingPage() {
  return (
    <NavWrapper activeTab="spending">
      <SpendingTab />
    </NavWrapper>
  );
}
