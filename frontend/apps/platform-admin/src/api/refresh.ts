import { authApi } from './auth';
import { useAuthStore } from '@/stores/auth';

/**
 * Single-flight access-token refresh.
 *
 *   - One Promise instance is shared by every concurrent failed
 *     request. Without this, 10 requests hitting a 401 at the same
 *     moment would trigger 10 refresh calls — wasteful and possibly
 *     racing on the server's token blacklist.
 *   - Cleared back to null on resolve OR reject, so the next batch
 *     of failures after a refresh failure gets a fresh attempt.
 */
let refreshPromise: Promise<void> | null = null;

export async function refreshAccessToken(): Promise<void> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  const data = await authApi.refresh(refreshToken);
  // The refresh endpoint rotates the access token but returns the same
  // refresh token (server side keeps the existing one until it
  // expires). Persist the new pair in the store.
  useAuthStore.getState().setSession({
    token: data.accessToken,
    refreshToken: data.refreshToken,
    username: data.user.username,
    realName: data.user.realName,
    roles: data.user.roles,
  });
}

export function getRefreshPromise(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
