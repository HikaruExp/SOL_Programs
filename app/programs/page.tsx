import { Suspense } from 'react';
import { getProgramsData } from '@/lib/data-server';
import { getAllLanguages } from '@/lib/data';
import { ProgramsClient } from './client';

export const revalidate = 60;

function ProgramsContent() {
  const data = getProgramsData();
  const languages = getAllLanguages(data.repos);

  return (
    <ProgramsClient
      programs={data.repos}
      languages={languages}
    />
  );
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProgramsContent />
    </Suspense>
  );
}
