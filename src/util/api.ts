import { logger } from '@railmapgen/rmg-runtime';
import { fetch } from '@tauri-apps/plugin-http';
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
        referer: 'https://railmapgen.org/',
    } as {
        accept: string;
        'Content-Type': string;
        'Cache-Control': string;
        referer: string;
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
    });
    if (refreshRep.status !== 200) {
        return;
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

export const checkTokenAndRefreshStore = async (store: ReturnType<typeof createStore>) => {
    const account = store.getState().account;
    if (!account.isLoggedIn) return;
    const expires = new Date(account.expires!);
    logger.debug(`Current time: ${new Date()}, access token expires time: ${expires}`);
    if (new Date().getTime() > expires.getTime()) {
        logger.debug(`Token expires on ${expires} needs to be refreshed on ${new Date()}`);
        const refreshExpires = new Date(account.refreshExpires!);
        if (new Date().getTime() > refreshExpires.getTime()) {
            logger.debug(`Refresh token expires on ${refreshExpires}, logout!`);
            store.dispatch(logout());
            return;
        }
        const refresh = await refreshToken(account.refreshToken!);
        logger.debug(`Token refreshed with ${JSON.stringify(refresh)}`);
        if (!refresh) {
            store.dispatch(logout());
            return;
        }
        store.dispatch(setToken({ access: refresh.access.token, refresh: refresh.refresh.token }));
        store.dispatch(setExpires({ expires: refresh.access.expires, refreshExpires: refresh.refresh.expires }));
    }
};
