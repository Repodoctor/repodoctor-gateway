import { describe, expect, it } from 'vitest';
import { AppError } from '@repodoctor/contracts';
import { deleteAuthUser, inviteAuthUser } from '../services/supabase-admin';

describe('supabase admin helpers', () => {
  it('sends an invite email through GoTrue', async () => {
    const result = await inviteAuthUser({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'service-role',
      email: 'new@example.com',
      redirectTo: 'https://repodoctor.dev/signup?invite=abc',
      fetchImpl: async (url, init) => {
        expect(String(url)).toBe('https://example.supabase.co/auth/v1/invite');
        expect((init?.headers as Record<string, string>).authorization).toBe('Bearer service-role');
        expect(JSON.parse(String(init?.body))).toEqual({
          email: 'new@example.com',
          redirect_to: 'https://repodoctor.dev/signup?invite=abc',
        });
        return new Response('{}', { status: 200 });
      },
    });
    expect(result).toEqual({ invited: true, skipped: false });
  });

  it('skips invite when the auth user already exists', async () => {
    const result = await inviteAuthUser({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'service-role',
      email: 'existing@example.com',
      redirectTo: 'https://repodoctor.dev/signup?invite=abc',
      fetchImpl: async () => new Response('{}', { status: 422 }),
    });
    expect(result).toEqual({ invited: false, skipped: true });
  });

  it('deletes a GoTrue user and ignores 404', async () => {
    await deleteAuthUser({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'service-role',
      userId: '11111111-1111-4111-8111-111111111111',
      fetchImpl: async (url) => {
        expect(String(url)).toContain('/auth/v1/admin/users/11111111-1111-4111-8111-111111111111');
        return new Response('', { status: 404 });
      },
    });
  });

  it('fails closed when GoTrue invite is unavailable', async () => {
    await expect(
      inviteAuthUser({
        supabaseUrl: 'https://example.supabase.co',
        serviceRoleKey: 'service-role',
        email: 'new@example.com',
        redirectTo: 'https://repodoctor.dev/signup?invite=abc',
        fetchImpl: async () => new Response('nope', { status: 500 }),
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
