import { MetadataRoute } from 'next';
import { getProgramsData } from '@/lib/data-server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getProgramsData();
  const baseUrl = 'https://solanaprograms.dev';

  // Static routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/programs`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ];

  // Program pages
  const programRoutes = data.repos.map((program) => ({
    url: `${baseUrl}/program/${encodeURIComponent(program.fullName)}`,
    lastModified: new Date(program.updated),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...routes, ...programRoutes];
}
