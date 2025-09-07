import 'server-only';
import { cachedFetchJSON } from '@/lib/cachedFetch.server';
import AppSidebar from '@/components/app-sidebar';

type Issue = {
  id: number;
  title: string;
  html_url: string;
  user: {
    login: string;
  };
};

export default async function Page() {
  const issues = await cachedFetchJSON<Issue[]>(
    'https://api.github.com/repos/vercel/next.js/issues?per_page=10&state=open',
    { ttl: 60_000 } // cache for 1 minute
  );

  return (
    <>
        <AppSidebar />
        <main className="flex-1">
             <header className="h-12 flex items-center px-4 border-b mb-4">
                <h1 className="text-lg font-semibold">Next.js Issues</h1>
            </header>
            <div className="p-4">
                <div className="border rounded-lg">
                    {issues.map(issue => (
                        <div key={issue.id} className="p-4 border-b last:border-b-0">
                            <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                {issue.title}
                            </a>
                            <p className="text-sm text-muted-foreground mt-1">
                                Opened by {issue.user.login}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    </>
  );
}
