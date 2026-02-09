import { Suspense } from 'react';
import { ProgramsClient } from './client';
import { getAllLanguages } from '@/lib/data';
import { getProgramsData } from '@/lib/data-server';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function ProgramsPage() {
  const data = await getProgramsData();
  const languages = getAllLanguages(data.repos);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProgramsClient
        programs={data.repos}
        languages={languages}
      />
    </Suspense>
  );
}
