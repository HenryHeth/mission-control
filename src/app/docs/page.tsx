'use client';

import DocsTab from '../components/DocsTab';
import NavWrapper from '../components/NavWrapper';

export default function DocsPage() {
  return (
    <NavWrapper activeTab="docs">
      <DocsTab />
    </NavWrapper>
  );
}
