'use client';

import CapturesTab from '../components/CapturesTab';
import NavWrapper from '../components/NavWrapper';

export default function CapturesPage() {
  return (
    <NavWrapper activeTab="captures">
      <CapturesTab />
    </NavWrapper>
  );
}
