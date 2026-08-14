import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import JobsCard from '../../components/JobsCard';

export const JobsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">All Jobs</h1>
        <JobsCard />
      </div>
    </MainLayout>
  );
};

export default JobsPage; 