'use client';

import MemoryTab from '../components/MemoryTab';
import NavWrapper from '../components/NavWrapper';

export default function MemoryPage() {
  return (
    <NavWrapper activeTab="memory">
      <MemoryTab />
    </NavWrapper>
  );
}
