import { API_ENDPOINT, API_URL } from './constants';

export const wait = (ms: number) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms, `Timeout after ${ms / 1000} seconds`);
    });
};

export const isSafari = () => {
    const ua = navigator.userAgent;
    return ua.includes('Safari') && !ua.includes('Chrome');
};

export const constructUrl = (path: string, search?: string, hash?: string): string => {
    const url = new URL(path, window.location.href);
    url.search = search ?? url.search;
    url.hash = hash ?? url.hash;
    return url.pathname + url.search + url.hash;
};

/**
 * A helper method to add json headers.
 */
export const apiFetch = async (
    apiEndpoint: API_ENDPOINT | string,
    init?: RequestInit,
    token?: string,
    refreshToken?: string
) => {
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
    if (rep.status !== 401) {
        return { rep, token, refreshToken };
    }
    if (!refreshToken) {
        return { rep, token, refreshToken: undefined };
    }
    const refreshRep = await fetch(`${API_URL}${API_ENDPOINT.AUTH_REFRESH}`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ refreshToken }),
    });
    if (refreshRep.status !== 200) {
        return { rep, token, refreshToken: undefined };
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
    const newToken = refresh.access.token;
    defaultHeaders['Authorization'] = `Bearer ${newToken}`;
    const retryRep = await fetch(`${API_URL}${apiEndpoint}`, {
        headers: defaultHeaders,
        ...init,
    });
    return { rep: retryRep, token: newToken, refreshToken: refresh.refresh.token };
};

// TODO: this is duplicate in apiFetch, and all token refreshes should be handled
// in initAccount instead of mixed in each request.
export const refreshToken = async (refreshToken: string) => {
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

export const createHash = async (data: string, algorithm = 'SHA-256') => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};
