import { describe, expect, it } from 'vitest';
import { githubAppInstallUrl } from '../services/github-install';

describe('githubAppInstallUrl', () => {
  it('builds the GitHub App install URL with organization state', () => {
    const organizationId = '11111111-1111-4111-8111-111111111111';
    expect(githubAppInstallUrl('repodoctor-app', organizationId)).toBe(
      `https://github.com/apps/repodoctor-app/installations/new?state=${organizationId}`,
    );
  });
});
