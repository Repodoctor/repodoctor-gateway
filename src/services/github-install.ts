export function githubAppInstallUrl(slug: string, organizationId: string): string {
  const url = new URL(`https://github.com/apps/${encodeURIComponent(slug)}/installations/new`);
  url.searchParams.set('state', organizationId);
  return url.toString();
}
