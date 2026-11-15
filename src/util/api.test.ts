import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { createTestStore } from '../test-utils';
import { login, logout } from '../redux/account/account-slice';
import { apiFetch, checkTokenAndRefresh, getAppleConfiguration, getAppleSubscriptionBridge } from './api';
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

    it('preserves native purchase error details', async () => {
        postMessage.mockResolvedValue({
            error: {
                domain: 'SKInternalErrorDomain',
                code: 14,
                message: 'The operation could not be completed.',
                underlying: [{ domain: 'ASDErrorDomain', code: 509, message: 'Account authentication failed.' }],
            },
        });
        await expect(getAppleSubscriptionBridge().postMessage({ type: 'purchase' })).rejects.toMatchObject({
            domain: 'SKInternalErrorDomain',
            code: 14,
            nativeMessage: 'The operation could not be completed.',
            message: 'Unable to connect to the App Store. Please try again.',
            underlying: [{ domain: 'ASDErrorDomain', code: 509, message: 'Account authentication failed.' }],
        });
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
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        vi.spyOn(globalThis, 'fetch').mockReset();
        vi.spyOn(logger, 'debug').mockImplementation(() => {});
        vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shares an in-flight refresh with unexpired credentials and permits later refreshes', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo(1, '2099-01-01T00:00:00Z')));
        const deferred = deferredResponse();
        vi.mocked(fetch).mockReturnValueOnce(deferred.promise).mockResolvedValue(response());

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
        expect(fetch).toHaveBeenCalledExactlyOnceWith(
            API_URL + API_ENDPOINT.AUTH_REFRESH,
            expect.objectContaining({ method: 'POST', body: JSON.stringify({ refreshToken: 'refresh-1' }) })
        );

        deferred.resolve(response());
        await Promise.all([firstForeground, timer, secondForeground]);
        expect(timerCompleted).toBe(true);
        expect(foregroundCompleted).toBe(true);
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

    it('retains the existing logout policy when the current session refresh fails', async () => {
        const store = createTestStore();
        store.dispatch(login(loginInfo()));
        vi.mocked(fetch).mockRejectedValue(new Error('Network unavailable'));

        await checkTokenAndRefresh(store);
        expect(store.getState().account.isLoggedIn).toBe(false);
    });
});

describe('apiFetch', () => {
    let originalWebkit: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalWebkit = Object.getOwnPropertyDescriptor(window, 'webkit');
        Object.defineProperty(window, 'webkit', {
            configurable: true,
            value: undefined,
        });
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        vi.spyOn(globalThis, 'fetch')
            .mockReset()
            .mockResolvedValue({ status: 200 } as Response);
    });

    afterEach(() => {
        if (originalWebkit) Object.defineProperty(window, 'webkit', originalWebkit);
        else Reflect.deleteProperty(window, 'webkit');
        vi.restoreAllMocks();
    });

    it('sends authenticated requests to the API server without a native purchase bridge', async () => {
        await apiFetch(API_ENDPOINT.AUTH_LOGIN, { method: 'POST', body: 'payload' }, 'account-token');
        expect(fetch).toHaveBeenCalledExactlyOnceWith(
            API_URL + API_ENDPOINT.AUTH_LOGIN,
            expect.objectContaining({
                method: 'POST',
                body: 'payload',
                headers: expect.objectContaining({ Authorization: 'Bearer account-token' }),
            })
        );
    });
});
