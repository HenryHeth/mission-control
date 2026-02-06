'use client';

import TasksTab from '../components/TasksTab';
import NavWrapper from '../components/NavWrapper';

export default function VelocityPage() {
  return (
    <NavWrapper activeTab="tasks">
      <TasksTab />
    </NavWrapper>
  );
}
