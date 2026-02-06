'use client';

import VVOTab from '../components/VVOTab';
import NavWrapper from '../components/NavWrapper';

export default function VVOPage() {
  return (
    <NavWrapper activeTab="vvo">
      <VVOTab />
    </NavWrapper>
  );
}
