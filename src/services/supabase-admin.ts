import { AppError, resilientFetch } from '@repodoctor/contracts';

function authBase(supabaseUrl: string): string {
  return supabaseUrl.replace(/\/+$/, '');
}

function adminHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'content-type': 'application/json',
  };
}

export async function inviteAuthUser(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  email: string;
  redirectTo: string;
  fetchImpl?: typeof fetch;
}): Promise<{ invited: boolean; skipped: boolean }> {
  const fetchImpl = input.fetchImpl ?? ((url, init) => resilientFetch('supabase-auth-admin', url, init));
  const response = await fetchImpl(`${authBase(input.supabaseUrl)}/auth/v1/invite`, {
    method: 'POST',
    headers: adminHeaders(input.serviceRoleKey),
    body: JSON.stringify({ email: input.email, redirect_to: input.redirectTo }),
  });
  if (response.ok) {
    return { invited: true, skipped: false };
  }
  if (response.status === 422 || response.status === 400) {
    return { invited: false, skipped: true };
  }
  throw new AppError({
    statusCode: 502,
    error: 'Bad Gateway',
    code: 'BAD_GATEWAY',
    message: `Supabase invite failed (${response.status})`,
  });
}

export async function deleteAuthUser(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? ((url, init) => resilientFetch('supabase-auth-admin', url, init));
  const response = await fetchImpl(
    `${authBase(input.supabaseUrl)}/auth/v1/admin/users/${encodeURIComponent(input.userId)}`,
    {
      method: 'DELETE',
      headers: adminHeaders(input.serviceRoleKey),
    },
  );
  if (response.ok || response.status === 404) {
    return;
  }
  throw new AppError({
    statusCode: 502,
    error: 'Bad Gateway',
    code: 'BAD_GATEWAY',
    message: `Supabase user delete failed (${response.status})`,
  });
}
