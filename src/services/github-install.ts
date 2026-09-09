export function githubAppInstallUrl(slug: string, organizationId: string): string {
  const url = new URL(`https://github.com/apps/${encodeURIComponent(slug)}/installations/new`);
  url.searchParams.set('state', organizationId);
  return url.toString();
}

export function githubAppConfigureUrl(slug: string, externalInstallationId: string): string {
  return `https://github.com/apps/${encodeURIComponent(slug)}/installations/${encodeURIComponent(externalInstallationId)}`;
}
