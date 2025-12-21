import { logger } from '@railmapgen/rmg-runtime';
import { logout, setExpires, setToken } from '../redux/account/account-slice';
import { createStore } from '../redux/index';
import { API_ENDPOINT, API_URL } from './constants';

/**
 * A helper method to add json headers.
 */
export const apiFetch = async (apiEndpoint: API_ENDPOINT | string, init?: RequestInit, token?: string) => {
    const defaultHeaders = {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
    } as {
        accept: string;
        'Content-Type': string;
        'Cache-Control': string;
        Authorization?: string;
    };
    const headers = structuredClone(defaultHeaders);
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const rep = await fetch(`${API_URL}${apiEndpoint}`, {
        headers,
        ...init,
    });
    return rep;
};

/**
 * All token refreshes should be handled here instead of mixed in each request.
 * On load, check the token and refresh it if necessary in initAccountStore.
 * Then set a timer to refresh the token before it expires. (also done in initAccountStore)
 */
const refreshToken = async (refreshToken: string) => {
    const defaultHeaders = {
        accept: 'application/json',
        'Content-Type': 'application/json',
    } as {
        accept: string;
        'Content-Type': string;
        Authorization?: string;
    };
    const refreshRep = await fetch(`${API_URL}${API_ENDPOINT.AUTH_REFRESH}`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(3000),
    });
    if (refreshRep.status !== 200) {
        throw new Error(`Failed to refresh token with status ${refreshRep.status}: ${await refreshRep.text()}`);
    }
    const refresh = (await refreshRep.json()) as {
        access: {
            token: string;
            expires: string;
        };
        refresh: {
            token: string;
            expires: string;
        };
    };
    return refresh;
};

/**
 * Check if the token is expired, and refresh it if needed using the refresh token.
 * Logout the user if the refresh token is also expired or the refresh fails.
 *
 * Param force is used to check the connection on app load and logout the user if offline.
 * This should render the app even if offline and invalidate the subsequent syncAfterLogin
 * and fetchSubscription in src/index.tsx.
 *
 * @param store The redux store
 * @param force Whether to force refresh the token regardless of expiry
 * @returns void
 */
export const checkTokenAndRefresh = async (store: ReturnType<typeof createStore>, force = false) => {
    const account = store.getState().account;
    if (!account.isLoggedIn) return;
    const expires = new Date(account.expires!);
    logger.debug(`Current time: ${new Date()}, access token expires time: ${expires}`);
    if (force || new Date().getTime() > expires.getTime()) {
        logger.debug(`Token expires on ${expires} needs to be refreshed on ${new Date()}`);
        const refreshExpires = new Date(account.refreshExpires!);
        if (new Date().getTime() > refreshExpires.getTime()) {
            logger.debug(`Refresh token expires on ${refreshExpires}, logout!`);
            store.dispatch(logout());
            return;
        }
        try {
            const refresh = await refreshToken(account.refreshToken!);
            logger.debug(`Token refreshed with ${JSON.stringify(refresh)}`);
            store.dispatch(setToken({ access: refresh.access.token, refresh: refresh.refresh.token }));
            store.dispatch(setExpires({ expires: refresh.access.expires, refreshExpires: refresh.refresh.expires }));
        } catch (err) {
            logger.error(`Failed to refresh token: ${err}, logout!`);
            store.dispatch(logout());
        }
    }
};
