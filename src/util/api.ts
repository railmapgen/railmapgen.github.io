import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { logout, setExpires, setToken } from '../redux/account/account-slice';
import type { RootStore } from '../redux/index';
import { API_ENDPOINT, API_URL } from './constants';

export type AppleEnvironment = 'PRODUCTION' | 'SANDBOX';

export interface AppleConfiguration {
    channel: 'stable' | 'testflight';
    environment: AppleEnvironment;
    environmentSource?: 'appTransaction' | 'development';
}

export interface AppleErrorDiagnostic {
    domain: string;
    code: number;
    message: string;
}

export class AppleStoreError extends Error {
    readonly domain: string;
    readonly code: number;
    readonly nativeMessage: string;
    readonly underlying: AppleErrorDiagnostic[];

    constructor(diagnostic: AppleErrorDiagnostic, underlying: AppleErrorDiagnostic[] = []) {
        super('Unable to connect to the App Store. Please try again.');
        this.name = 'AppleStoreError';
        this.domain = diagnostic.domain;
        this.code = diagnostic.code;
        this.nativeMessage = diagnostic.message;
        this.underlying = underlying;
    }

    get diagnosticSummary(): string {
        return [this, ...this.underlying].map(error => `${error.domain} (${error.code})`).join(' → ');
    }
}

export interface AppleSubscriptionBridge {
    postMessage(message: Record<string, unknown>): Promise<unknown>;
}

const isDiagnostic = (value: unknown): value is AppleErrorDiagnostic => {
    if (!value || typeof value !== 'object') return false;
    const error = value as AppleErrorDiagnostic;
    return typeof error.domain === 'string' && Number.isInteger(error.code) && typeof error.message === 'string';
};

const unwrapReply = (reply: unknown): unknown => {
    if (reply && typeof reply === 'object' && 'error' in reply) {
        const error = (reply as { error: unknown }).error;
        if (isDiagnostic(error)) {
            const underlying = (error as AppleErrorDiagnostic & { underlying?: unknown }).underlying;
            throw new AppleStoreError(
                error,
                Array.isArray(underlying) ? underlying.filter(isDiagnostic).slice(0, 4) : []
            );
        }
        throw new Error('Unable to connect to the App Store. Please try again.');
    }
    return reply;
};

export const getAppleSubscriptionBridge = (): AppleSubscriptionBridge => {
    const nativeWindow = window as unknown as {
        webkit?: { messageHandlers?: { rmtSubscriptions?: AppleSubscriptionBridge } };
    };
    const bridge = nativeWindow.webkit?.messageHandlers?.rmtSubscriptions;
    if (rmgRuntime.getInstance() !== 'AppStore' || !bridge) {
        throw new Error('App Store purchases are unavailable in this version.');
    }
    return {
        postMessage: async message => unwrapReply(await bridge.postMessage(message)),
    };
};

const validateConfiguration = (reply: unknown) => {
    const configuration = unwrapReply(reply) as AppleConfiguration;
    if (
        !configuration ||
        !['stable', 'testflight'].includes(configuration.channel) ||
        !['PRODUCTION', 'SANDBOX'].includes(configuration.environment)
    ) {
        throw new Error('Unable to determine the App Store purchase environment.');
    }
    if (configuration.channel === 'testflight' && configuration.environment !== 'SANDBOX') {
        throw new Error('This TestFlight build cannot make production purchases.');
    }
    return configuration;
};

export const getAppleConfiguration = async (bridge = getAppleSubscriptionBridge()): Promise<AppleConfiguration> => {
    const configuration = validateConfiguration(await bridge.postMessage({ type: 'configuration' }));
    if (
        configuration.environmentSource !== undefined &&
        !['appTransaction', 'development'].includes(configuration.environmentSource)
    )
        throw new Error('Unable to determine the App Store purchase environment.');
    return configuration;
};

/** This may prompt for App Store authentication; call only after an explicit user action. */
export const refreshAppleConfiguration = async (bridge = getAppleSubscriptionBridge()): Promise<AppleConfiguration> => {
    const configuration = validateConfiguration(await bridge.postMessage({ type: 'refreshConfiguration' }));
    if (configuration.environmentSource !== undefined && configuration.environmentSource !== 'appTransaction')
        throw new Error('Unable to determine the App Store purchase environment.');
    return configuration;
};

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

const pendingTokenRefreshes = new WeakMap<RootStore, { isCurrentSession: () => boolean; promise: Promise<void> }>();

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
export const checkTokenAndRefresh = async (store: RootStore, force = false) => {
    const account = store.getState().account;
    if (!account.isLoggedIn) return;
    // Foreground callers must also wait for a timer refresh already in progress.
    const pending = pendingTokenRefreshes.get(store);
    if (pending?.isCurrentSession()) return pending.promise;
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
        let isCurrentSession = true;
        // Remember logout/account changes even if the same credentials are later restored.
        const unsubscribe = store.subscribe(() => {
            const current = store.getState().account;
            if (
                !current.isLoggedIn ||
                current.id !== account.id ||
                current.token !== account.token ||
                current.refreshToken !== account.refreshToken
            ) {
                isCurrentSession = false;
            }
        });
        const request: Promise<void> = (async () => {
            try {
                const refresh = await refreshToken(account.refreshToken!);
                if (!isCurrentSession) return;
                unsubscribe();
                logger.debug('Token refreshed.');
                store.dispatch(setToken({ access: refresh.access.token, refresh: refresh.refresh.token }));
                store.dispatch(
                    setExpires({ expires: refresh.access.expires, refreshExpires: refresh.refresh.expires })
                );
            } catch (err) {
                if (!isCurrentSession) return;
                unsubscribe();
                logger.error(`Failed to refresh token: ${err}, logout!`);
                store.dispatch(logout());
            }
        })().finally(() => {
            unsubscribe();
            if (pendingTokenRefreshes.get(store)?.promise === request) pendingTokenRefreshes.delete(store);
        });
        pendingTokenRefreshes.set(store, { isCurrentSession: () => isCurrentSession, promise: request });
        return request;
    }
};
