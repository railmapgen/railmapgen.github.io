import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { createTestStore } from '../test-utils';
import { login, logout } from '../redux/account/account-slice';
import {
    AppleStoreError,
    apiFetch,
    checkTokenAndRefresh,
    getAppleConfiguration,
    getAppleSubscriptionBridge,
} from './api';
import { API_ENDPOINT, API_URL } from './constants';

describe('Apple native connection diagnostics and purchase environment', () => {
    const postMessage = vi.fn();
    let originalWebkit: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalWebkit = Object.getOwnPropertyDescriptor(window, 'webkit');
        Object.defineProperty(window, 'webkit', {
            configurable: true,
            value: { messageHandlers: { rmtSubscriptions: { postMessage } } },
        });
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        postMessage.mockReset();
    });

    afterEach(() => {
        if (originalWebkit) Object.defineProperty(window, 'webkit', originalWebkit);
        else Reflect.deleteProperty(window, 'webkit');
        vi.restoreAllMocks();
    });

    it('requires signed purchase configuration rather than a receipt hint', async () => {
        const configuration = { channel: 'stable', environment: 'SANDBOX', environmentSource: 'receipt' };
        postMessage.mockResolvedValue(configuration);
        await expect(getAppleConfiguration()).rejects.toThrow('Unable to determine');
    });

    it('retains internal domain, code and underlying errors without guessing the meaning of code 14', async () => {
        postMessage.mockResolvedValue({
            error: {
                domain: 'SKInternalErrorDomain',
                code: 14,
                message: 'The operation could not be completed.',
                underlying: [{ domain: 'ASDErrorDomain', code: 509, message: 'Account authentication failed.' }],
            },
        });
        let error: unknown;
        try {
            await getAppleConfiguration();
        } catch (caught) {
            error = caught;
        }
        expect(error).toBeInstanceOf(AppleStoreError);
        expect(error).toMatchObject({
            domain: 'SKInternalErrorDomain',
            code: 14,
            nativeMessage: 'The operation could not be completed.',
            message: 'Unable to connect to the App Store. Please try again.',
            underlying: [{ domain: 'ASDErrorDomain', code: 509, message: 'Account authentication failed.' }],
        });
        expect((error as AppleStoreError).diagnosticSummary).toBe('SKInternalErrorDomain (14) → ASDErrorDomain (509)');
        expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'configuration' });
    });

    it('unwraps diagnostic failures from purchase commands too', async () => {
        postMessage.mockResolvedValue({
            error: { domain: 'SKErrorDomain', code: 14, message: 'Invalid offer price.' },
        });
        await expect(getAppleSubscriptionBridge().postMessage({ type: 'purchase' })).rejects.toMatchObject({
            domain: 'SKErrorDomain',
            code: 14,
            nativeMessage: 'Invalid offer price.',
        });
    });

    it('does not accept Production purchases in a TestFlight build', async () => {
        postMessage.mockResolvedValue({
            channel: 'testflight',
            environment: 'PRODUCTION',
            environmentSource: 'appTransaction',
        });
        await expect(getAppleConfiguration()).rejects.toThrow('cannot make production purchases');
    });

    it('does not expose the native bridge on website builds', () => {
        vi.mocked(rmgRuntime.getInstance).mockReturnValue('GitHub');
        expect(() => getAppleSubscriptionBridge()).toThrow('unavailable');
        expect(postMessage).not.toHaveBeenCalled();
    });
});

describe('account token refresh coordination', () => {
    const loginInfo = (id = 1, expires = '2000-01-01T00:00:00Z') => ({
        id,
        name: `Account ${id}`,
        email: `account-${id}@example.test`,
        token: `access-${id}`,
        expires,
        refreshToken: `refresh-${id}`,
        refreshExpires: '2099-01-01T00:00:00Z',
    });
    const refreshedTokens = {
        access: { token: 'new-access', expires: '2098-01-01T00:00:00Z' },
        refresh: { token: 'new-refresh', expires: '2099-01-02T00:00:00Z' },
    };
    const response = () => ({ status: 200, json: async () => refreshedTokens }) as Response;
    const deferredResponse = () => {
        let resolve!: (response: Response) => void;
        let reject!: (error: Error) => void;
        const promise = new Promise<Response>((resolveResponse, rejectResponse) => {
            resolve = resolveResponse;
            reject = rejectResponse;
        });
        return { promise, resolve, reject };
    };

    beforeEach(() => {
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('GitHub');
        vi.spyOn(globalThis, 'fetch').mockReset();
        vi.spyOn(logger, 'debug').mockImplementation(() => {});
        vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shares one refresh between the timer and forced foreground checks, then permits the next refresh', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo()));
        const deferred = deferredResponse();
        vi.mocked(fetch).mockReturnValueOnce(deferred.promise).mockResolvedValue(response());

        const timer = checkTokenAndRefresh(store);
        const foreground = checkTokenAndRefresh(store, true);
        expect(fetch).toHaveBeenCalledOnce();
        deferred.resolve(response());
        await Promise.all([timer, foreground]);

        expect(store.getState().account).toMatchObject({
            isLoggedIn: true,
            token: refreshedTokens.access.token,
            refreshToken: refreshedTokens.refresh.token,
            expires: refreshedTokens.access.expires,
            refreshExpires: refreshedTokens.refresh.expires,
        });
        await checkTokenAndRefresh(store, true);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('waits for an in-flight forced refresh even while the saved access token has not expired', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo(1, '2099-01-01T00:00:00Z')));
        const deferred = deferredResponse();
        vi.mocked(fetch).mockReturnValue(deferred.promise);

        const firstForeground = checkTokenAndRefresh(store, true);
        let timerCompleted = false;
        let foregroundCompleted = false;
        const timer = checkTokenAndRefresh(store).then(() => {
            timerCompleted = true;
        });
        const secondForeground = checkTokenAndRefresh(store, true).then(() => {
            foregroundCompleted = true;
        });
        await Promise.resolve();
        expect(timerCompleted).toBe(false);
        expect(foregroundCompleted).toBe(false);
        expect(fetch).toHaveBeenCalledOnce();

        deferred.resolve(response());
        await Promise.all([firstForeground, timer, secondForeground]);
        expect(timerCompleted).toBe(true);
        expect(foregroundCompleted).toBe(true);
    });

    it('keeps refresh requests independent for different stores', async () => {
        const firstStore = createTestStore();
        const secondStore = createTestStore();
        firstStore.dispatch(login(loginInfo(1)));
        secondStore.dispatch(login(loginInfo(2)));
        const firstResponse = deferredResponse();
        const secondResponse = deferredResponse();
        vi.mocked(fetch).mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise);

        const firstRefresh = checkTokenAndRefresh(firstStore);
        const secondRefresh = checkTokenAndRefresh(secondStore);
        expect(fetch).toHaveBeenCalledTimes(2);
        firstResponse.resolve(response());
        await firstRefresh;
        expect(secondStore.getState().account.token).toBe('access-2');
        secondResponse.resolve(response());
        await secondRefresh;
        expect(firstStore.getState().account.token).toBe(refreshedTokens.access.token);
        expect(secondStore.getState().account.token).toBe(refreshedTokens.access.token);
    });

    it('ignores the old refresh and keeps sharing the replacement account refresh', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo(1)));
        const oldResponse = deferredResponse();
        const newResponse = deferredResponse();
        vi.mocked(fetch).mockReturnValueOnce(oldResponse.promise).mockReturnValueOnce(newResponse.promise);
        const oldRefresh = checkTokenAndRefresh(store);

        store.dispatch(login(loginInfo(2)));
        const newRefresh = checkTokenAndRefresh(store, true);
        oldResponse.resolve(response());
        await oldRefresh;
        expect(store.getState().account).toMatchObject({ id: 2, isLoggedIn: true, token: 'access-2' });
        const concurrentRefresh = checkTokenAndRefresh(store, true);
        expect(fetch).toHaveBeenCalledTimes(2);

        newResponse.resolve(response());
        await Promise.all([newRefresh, concurrentRefresh]);
        expect(store.getState().account).toMatchObject({ id: 2, isLoggedIn: true, token: 'new-access' });
    });

    it('does not log out a new account when an earlier refresh fails', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo(1)));
        const deferred = deferredResponse();
        vi.mocked(fetch).mockReturnValue(deferred.promise);
        const refresh = checkTokenAndRefresh(store);

        store.dispatch(login(loginInfo(2)));
        deferred.reject(new Error('Network unavailable'));
        await refresh;
        expect(store.getState().account).toMatchObject({ id: 2, isLoggedIn: true, token: 'access-2' });
    });

    it.each(['success', 'failure'] as const)(
        'ignores a late %s after logout and login with the same saved credentials',
        async result => {
            const store = createTestStore();
            store.dispatch(login(loginInfo()));
            const deferred = deferredResponse();
            vi.mocked(fetch).mockReturnValue(deferred.promise);
            const refresh = checkTokenAndRefresh(store);

            store.dispatch(logout());
            store.dispatch(login(loginInfo()));
            if (result === 'success') deferred.resolve(response());
            else deferred.reject(new Error('Network unavailable'));
            await refresh;
            expect(store.getState().account).toMatchObject({ id: 1, isLoggedIn: true, token: 'access-1' });
        }
    );

    it('does not restore account tokens when refresh finishes after logout', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo()));
        const deferred = deferredResponse();
        vi.mocked(fetch).mockReturnValue(deferred.promise);
        const refresh = checkTokenAndRefresh(store);

        store.dispatch(logout());
        deferred.resolve(response());
        await refresh;
        expect(store.getState().account).toMatchObject({
            isLoggedIn: false,
            token: undefined,
            refreshToken: undefined,
        });
    });

    it('retains the existing logout policy when the current session refresh fails', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo()));
        vi.mocked(fetch).mockRejectedValue(new Error('Network unavailable'));

        await checkTokenAndRefresh(store);
        expect(store.getState().account.isLoggedIn).toBe(false);
    });
});

describe('shared API server', () => {
    const postMessage = vi.fn();
    let originalWebkit: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalWebkit = Object.getOwnPropertyDescriptor(window, 'webkit');
        Object.defineProperty(window, 'webkit', {
            configurable: true,
            value: { messageHandlers: { rmtSubscriptions: { postMessage } } },
        });
        postMessage.mockReset().mockRejectedValue(new Error('App Store unavailable'));
        vi.spyOn(globalThis, 'fetch')
            .mockReset()
            .mockResolvedValue({ status: 200 } as Response);
        vi.spyOn(logger, 'debug').mockImplementation(() => {});
        vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        if (originalWebkit) Object.defineProperty(window, 'webkit', originalWebkit);
        else Reflect.deleteProperty(window, 'webkit');
        vi.restoreAllMocks();
    });

    it.each(['GitHub', 'AppStore'] as const)(
        'uses the original API for %s account, cloud and purchase calls without StoreKit configuration',
        async instance => {
            vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue(instance);
            for (const endpoint of [
                API_ENDPOINT.AUTH_LOGIN,
                API_ENDPOINT.USER,
                API_ENDPOINT.SAVES,
                API_ENDPOINT.APPLE_IAP_CONTEXT,
                API_ENDPOINT.APPLE_IAP_TRANSACTIONS,
            ]) {
                await apiFetch(endpoint, { method: 'POST', body: 'payload' }, 'account-token');
                expect(fetch).toHaveBeenLastCalledWith(
                    'https://railmapgen.org/v1' + endpoint,
                    expect.objectContaining({
                        method: 'POST',
                        body: 'payload',
                        headers: expect.objectContaining({ Authorization: 'Bearer account-token' }),
                    })
                );
            }
            expect(postMessage).not.toHaveBeenCalled();
        }
    );

    it('allows AppStore account calls without a native purchase bridge', async () => {
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        Reflect.deleteProperty(window, 'webkit');
        await apiFetch(API_ENDPOINT.AUTH_LOGIN, { method: 'POST' });
        expect(fetch).toHaveBeenCalledExactlyOnceWith(
            API_URL + API_ENDPOINT.AUTH_LOGIN,
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('refreshes AppStore account tokens on the original server without consulting StoreKit', async () => {
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        const store = createTestStore();
        store.dispatch(
            login({
                id: 7,
                name: 'Account user',
                email: 'tester@example.test',
                token: 'expired-access',
                expires: '2000-01-01T00:00:00Z',
                refreshToken: 'account-refresh',
                refreshExpires: '2099-01-01T00:00:00Z',
            })
        );
        vi.mocked(fetch).mockResolvedValue({
            status: 200,
            json: async () => ({
                access: { token: 'new-access', expires: '2098-01-01T00:00:00Z' },
                refresh: { token: 'new-refresh', expires: '2099-01-01T00:00:00Z' },
            }),
        } as Response);
        await checkTokenAndRefresh(store);
        expect(fetch).toHaveBeenCalledExactlyOnceWith(
            API_URL + API_ENDPOINT.AUTH_REFRESH,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ refreshToken: 'account-refresh' }),
            })
        );
        expect(store.getState().account).toMatchObject({
            isLoggedIn: true,
            token: 'new-access',
            refreshToken: 'new-refresh',
        });
        expect(postMessage).not.toHaveBeenCalled();
    });
});
