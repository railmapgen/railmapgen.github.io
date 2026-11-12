import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import AccountView from '../components/menu/account-view/account-view';
import { login, logout, setToken } from '../redux/account/account-slice';
import { setAccountPage, setIsPrimary, setMenuView, terminateSession } from '../redux/app/app-slice';
import { createTestStore, render } from '../test-utils';
import { apiFetch, checkTokenAndRefresh } from './api';
import { API_ENDPOINT, FRAME_ID_PREFIX } from './constants';
import {
    installAppleSubscriptions,
    purchaseAppleSubscription,
    registerSubscriptionRedemption,
} from './subscription-redemption';

vi.mock('./api', async importOriginal => {
    const actual = await importOriginal<typeof import('./api')>();
    return { ...actual, apiFetch: vi.fn(actual.apiFetch), checkTokenAndRefresh: vi.fn() };
});

const loginInfo = {
    id: 42,
    name: 'Tester',
    email: 'tester@example.com',
    token: 'test-token',
    expires: '2099-01-01T00:00:00Z',
    refreshToken: 'test-refresh-token',
    refreshExpires: '2099-01-02T00:00:00Z',
};

describe('subscription redemption entry', () => {
    let request: (data: unknown, frameId?: string) => void;
    let frame: HTMLIFrameElement;

    beforeEach(() => {
        vi.spyOn(rmgRuntime, 'onMessage').mockImplementation((event, callback) => {
            if (event === 'OPEN_SUBSCRIPTION_REDEMPTION') request = callback;
        });
        vi.spyOn(rmgRuntime, 'toggleNavMenu').mockImplementation(() => {});
        frame = document.createElement('iframe');
        frame.id = FRAME_ID_PREFIX + 'painter';
        document.body.append(frame);
    });

    afterEach(() => {
        frame.remove();
        vi.restoreAllMocks();
    });

    const setup = (isLoggedIn = false) => {
        const initial = createTestStore().getState();
        const store = createTestStore({
            app: {
                ...initial.app,
                isShowMenu: false,
                openedTabs: [{ id: 'painter', app: 'rmp' }],
                activeTab: 'painter',
                isPrimary: true,
            },
            account: { ...initial.account, ...(isLoggedIn ? loginInfo : {}), isLoggedIn },
        });
        registerSubscriptionRedemption(store);
        return store;
    };

    it('opens one redemption dialog and keeps the sidebar open on repeated requests', async () => {
        const store = setup(true);
        render(<AccountView />, { store });
        act(() => request(undefined, frame.id));
        expect(store.getState().app).toMatchObject({ isShowMenu: true, menuView: 'account' });
        await screen.findByRole('dialog', { name: /Find your way to create/ });
        expect(screen.getAllByRole('dialog', { name: /Find your way to create/ })).toHaveLength(1);
        fireEvent.change(screen.getByRole('textbox', { name: 'CDKey' }), { target: { value: 'keep-this-code' } });
        act(() => request(undefined, frame.id));
        expect(store.getState().app.isShowMenu).toBe(true);
        expect(screen.getAllByRole('dialog', { name: /Find your way to create/ })).toHaveLength(1);
        expect(screen.getByRole('textbox', { name: 'CDKey' })).toHaveValue('keep-this-code');
        expect(rmgRuntime.toggleNavMenu).toHaveBeenLastCalledWith(true);
    });

    it.each(['register', 'forgot-password'] as const)(
        'shows login from %s and never queues redemption after login',
        page => {
            const store = setup();
            store.dispatch(setAccountPage(page));
            render(<AccountView />, { store });
            act(() => request(undefined, frame.id));
            expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
            expect(store.getState().app).toMatchObject({
                isShowMenu: true,
                menuView: 'account',
                isRedeemModalOpen: false,
            });
            act(() => store.dispatch(login(loginInfo)));
            expect(screen.getByRole('button', { name: 'Redeem' })).toBeInTheDocument();
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        }
    );

    it('clears the dialog when leaving the account view or logging out', () => {
        const store = setup(true);
        request(undefined, frame.id);
        store.dispatch(setMenuView('apps'));
        expect(store.getState().app.isRedeemModalOpen).toBe(false);
        request(undefined, frame.id);
        store.dispatch(logout());
        store.dispatch(login(loginInfo));
        expect(store.getState().app.isRedeemModalOpen).toBe(false);
        expect(store.getState().app.accountPage).toBe('login');
    });

    it('ignores standalone, foreign and removed frames', () => {
        const store = setup(true);
        const before = store.getState();
        request(undefined);
        request(undefined, FRAME_ID_PREFIX + 'another-window');
        frame.remove();
        request(undefined, frame.id);
        expect(store.getState()).toBe(before);
        expect(rmgRuntime.toggleNavMenu).not.toHaveBeenCalled();
    });

    it.each(['secondary', 'terminated'])('ignores a %s RMT instance', state => {
        const store = setup(true);
        if (state === 'secondary') store.dispatch(setIsPrimary(false));
        else store.dispatch(terminateSession());
        const before = store.getState();
        request(undefined, frame.id);
        expect(store.getState()).toBe(before);
        expect(rmgRuntime.toggleNavMenu).not.toHaveBeenCalled();
    });
});

const context = {
    enabled: true,
    claimRequired: false,
    allowedEnvironments: ['PRODUCTION'],
    subscriptionGroupId: '22559988',
    products: [{ productId: 'subscription_ultimate' }],
};
const transaction = {
    id: 'local-restored-transaction',
    productID: 'subscription_ultimate',
    signedTransaction: 'signed.transaction.proof',
    environment: 'PRODUCTION',
};
const delivery = {
    transactionId: 'canonical-server-transaction',
    environment: 'PRODUCTION',
    claimRequired: false,
    finishAllowed: true,
    deliveryStatus: 'DELIVERED',
};
const stableConfiguration = { channel: 'stable', environment: 'PRODUCTION' };
const subscriptions = [{ type: 'RMP_CLOUD', expires: '2099-01-01T00:00:00Z' }];
const response = (body: unknown, status = 200) =>
    ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;
const createLoggedInStore = () => {
    const initial = createTestStore().getState();
    return createTestStore({ account: { ...initial.account, isLoggedIn: true, id: 7, token: 'account-token' } });
};

describe('Apple subscription purchase and delivery', () => {
    const postMessage = vi.fn();
    let originalWebkit: PropertyDescriptor | undefined;
    const nativeResult =
        (result: unknown, configuration = stableConfiguration) =>
        async (message: { type: string }) =>
            message.type === 'hasPendingTransactions'
                ? { hasPendingTransactions: true }
                : message.type === 'configuration'
                  ? configuration
                  : message.type === 'purchase'
                    ? result
                    : {};

    const emptyRecovery = async (message: { type: string }) =>
        message.type === 'hasPendingTransactions'
            ? { hasPendingTransactions: true }
            : message.type === 'configuration'
              ? stableConfiguration
              : { transactions: [] };

    beforeEach(() => {
        originalWebkit = Object.getOwnPropertyDescriptor(window, 'webkit');
        Object.defineProperty(window, 'webkit', {
            configurable: true,
            value: { messageHandlers: { rmtSubscriptions: { postMessage } } },
        });
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        vi.spyOn(logger, 'warn').mockImplementation(() => {});
        vi.mocked(checkTokenAndRefresh).mockReset().mockResolvedValue(undefined);
        postMessage.mockReset().mockImplementation(nativeResult({ status: 'purchased', transactions: [transaction] }));
        vi.mocked(apiFetch)
            .mockReset()
            .mockImplementation(async endpoint => {
                if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) return response(context);
                if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) return response(delivery);
                if (endpoint === API_ENDPOINT.SUBSCRIPTION) return response({ subscriptions });
                throw new Error(`Unexpected API endpoint: ${endpoint}`);
            });
    });

    afterEach(() => {
        if (originalWebkit) Object.defineProperty(window, 'webkit', originalWebkit);
        else Reflect.deleteProperty(window, 'webkit');
        vi.restoreAllMocks();
    });

    it('does not expose the native purchase bridge outside AppStore', async () => {
        vi.mocked(rmgRuntime.getInstance).mockReturnValue('GitHub');
        await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow('unavailable');
        expect(apiFetch).not.toHaveBeenCalled();
        expect(postMessage).not.toHaveBeenCalled();
    });

    it.each([{ enabled: false }, { claimRequired: true }, { subscriptionGroupId: null }, { products: [] }])(
        'does not open a purchase when the server context is unavailable: %j',
        async unavailable => {
            vi.mocked(apiFetch).mockResolvedValue(response({ ...context, ...unavailable }));
            await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow('not available yet');
            expect(postMessage).not.toHaveBeenCalled();
        }
    );

    it('rejects a TestFlight build reporting a production store before opening a purchase', async () => {
        postMessage.mockImplementation(
            nativeResult(
                { status: 'purchased', transactions: [transaction] },
                {
                    channel: 'testflight',
                    environment: 'PRODUCTION',
                }
            )
        );
        await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow(
            'cannot make production purchases'
        );
        expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
            API_ENDPOINT.APPLE_IAP_CONTEXT,
            expect.anything(),
            'account-token'
        );
        expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'configuration' });
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });

    it.each(['testflight', 'stable'])(
        'delivers a %s Sandbox purchase without overriding the signed transaction sent to the server',
        async channel => {
            const sandboxTransaction = { ...transaction, environment: 'SANDBOX' };
            postMessage.mockImplementation(
                nativeResult(
                    { status: 'purchased', transactions: [sandboxTransaction] },
                    {
                        channel,
                        environment: 'SANDBOX',
                    }
                )
            );
            vi.mocked(apiFetch).mockImplementation(async endpoint => {
                if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) {
                    return response({ ...context, allowedEnvironments: ['SANDBOX'] });
                }
                if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS)
                    return response({ ...delivery, environment: 'SANDBOX' });
                return response({ subscriptions });
            });
            await expect(purchaseAppleSubscription(createLoggedInStore())).resolves.toBe('purchased');
            expect(postMessage).toHaveBeenCalledWith({
                type: 'purchase',
                productIDs: ['subscription_ultimate'],
                subscriptionGroupID: '22559988',
                language: rmgRuntime.getLanguage(),
                allowedEnvironments: ['SANDBOX'],
            });
            const verification = vi
                .mocked(apiFetch)
                .mock.calls.find(([endpoint]) => endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS);
            expect(JSON.parse(verification![1]!.body as string)).toEqual({
                signedTransactionInfo: sandboxTransaction.signedTransaction,
            });
            expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: [transaction.id] });
        }
    );

    it.each([
        ['stable', 'PRODUCTION'],
        ['stable', 'SANDBOX'],
        ['testflight', 'SANDBOX'],
    ])('delivers a %s %s purchase when the same server supports both environments', async (channel, environment) => {
        const proof = { ...transaction, environment };
        postMessage.mockImplementation(
            nativeResult({ status: 'purchased', transactions: [proof] }, { channel, environment })
        );
        vi.mocked(apiFetch).mockImplementation(async endpoint => {
            if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) {
                return response({ ...context, allowedEnvironments: ['PRODUCTION', 'SANDBOX'] });
            }
            if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) return response({ ...delivery, environment });
            return response({ subscriptions });
        });

        await expect(purchaseAppleSubscription(createLoggedInStore())).resolves.toBe('purchased');
        expect(postMessage).toHaveBeenCalledWith({
            type: 'purchase',
            productIDs: ['subscription_ultimate'],
            subscriptionGroupID: '22559988',
            language: rmgRuntime.getLanguage(),
            allowedEnvironments: [environment],
        });
        expect(apiFetch).toHaveBeenCalledWith(
            API_ENDPOINT.APPLE_IAP_TRANSACTIONS,
            expect.objectContaining({ body: JSON.stringify({ signedTransactionInfo: proof.signedTransaction }) }),
            'account-token'
        );
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: [proof.id] });
        expect(rmgRuntime.postEvent).toHaveBeenCalledWith('SUBSCRIPTION_REDEEMED', undefined);
    });

    it.each([undefined, null, [], 'SANDBOX', ['XCODE'], ['PRODUCTION', 'UNKNOWN']])(
        'rejects invalid advertised payment environments before querying StoreKit: %j',
        async allowedEnvironments => {
            vi.mocked(apiFetch).mockResolvedValue(response({ ...context, allowedEnvironments }));
            await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow(
                'server environment does not match'
            );
            expect(postMessage).not.toHaveBeenCalled();
            expect(apiFetch).toHaveBeenCalledTimes(1);
        }
    );

    it('does not call StoreKit when the account server has not deployed IAP', async () => {
        vi.mocked(apiFetch).mockResolvedValue(response({ message: 'Not found' }, 404));
        await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow('not available yet');
        expect(postMessage).not.toHaveBeenCalled();
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });

    it('silently skips post-login IAP recovery on an existing account server without IAP', async () => {
        const store = createTestStore();
        vi.mocked(apiFetch).mockResolvedValue(response({ message: 'Not found' }, 404));
        const dispose = installAppleSubscriptions(store);
        try {
            expect(postMessage).not.toHaveBeenCalled();
            store.dispatch(login(loginInfo));
            await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
            expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });
            expect(logger.warn).not.toHaveBeenCalled();
            expect(store.getState().account.isLoggedIn).toBe(true);
        } finally {
            dispose();
        }
    });

    it.each(['testflight', 'stable'])(
        'rejects context that does not allow Sandbox purchases for a %s install before opening the native store',
        async channel => {
            postMessage.mockImplementation(
                nativeResult(
                    { status: 'cancelled', transactions: [] },
                    {
                        channel,
                        environment: 'SANDBOX',
                    }
                )
            );
            await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow(
                'server environment does not match'
            );
            expect(apiFetch).toHaveBeenCalledTimes(1);
            expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'configuration' });
            expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
        }
    );

    it.each([
        ['stable', 'PRODUCTION', 'SANDBOX'],
        ['testflight', 'SANDBOX', 'PRODUCTION'],
    ])(
        'never verifies or finishes a %s purchase from the wrong environment',
        async (channel, environment, proofEnvironment) => {
            postMessage.mockImplementation(
                nativeResult(
                    {
                        status: 'purchased',
                        transactions: [{ ...transaction, environment: proofEnvironment }],
                    },
                    { channel, environment }
                )
            );
            vi.mocked(apiFetch).mockResolvedValue(
                response({ ...context, allowedEnvironments: ['PRODUCTION', 'SANDBOX'] })
            );
            await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow('does not match');
            expect(apiFetch).toHaveBeenCalledTimes(1);
            expect(postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'finish' }));
            expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
        }
    );

    it('waits for server delivery before finishing the local restored ID and refreshing entitlements', async () => {
        const store = createLoggedInStore();
        let completeVerification!: (value: Response) => void;
        vi.mocked(apiFetch).mockImplementation(async endpoint => {
            if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) return response(context);
            if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) {
                return new Promise<Response>(resolve => {
                    completeVerification = resolve;
                });
            }
            return response({ subscriptions });
        });
        const purchase = purchaseAppleSubscription(store);
        await waitFor(() => expect(completeVerification).toBeTypeOf('function'));
        expect(postMessage).toHaveBeenCalledWith({
            type: 'purchase',
            productIDs: ['subscription_ultimate'],
            subscriptionGroupID: '22559988',
            language: rmgRuntime.getLanguage(),
            allowedEnvironments: ['PRODUCTION'],
        });
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
        expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBeUndefined();

        completeVerification(response(delivery));
        await expect(purchase).resolves.toBe('purchased');
        expect(apiFetch).toHaveBeenCalledWith(
            API_ENDPOINT.APPLE_IAP_TRANSACTIONS,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ signedTransactionInfo: transaction.signedTransaction }),
            }),
            'account-token'
        );
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: [transaction.id] });
        expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(subscriptions[0].expires);
        expect(rmgRuntime.postEvent).toHaveBeenCalledExactlyOnceWith('SUBSCRIPTION_REDEEMED', undefined);
    });

    it.each([
        [503, { message: 'Purchase processing is temporarily unavailable' }],
        [409, { message: 'This subscription belongs to another account' }],
        [200, { ...delivery, finishAllowed: false, claimRequired: true }],
    ])('leaves transactions unfinished when verification cannot deliver (HTTP %s)', async (status, body) => {
        vi.mocked(apiFetch).mockImplementation(async endpoint =>
            endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT ? response(context) : response(body, status)
        );
        await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow();
        expect(postMessage).toHaveBeenCalledTimes(2);
        expect(postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'finish' }));
        expect(apiFetch).not.toHaveBeenCalledWith(API_ENDPOINT.SUBSCRIPTION, expect.anything(), expect.anything());
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });

    it.each([
        { environment: 'SANDBOX' },
        { claimRequired: true },
        { claimRequired: undefined },
        { deliveryStatus: 'UNCLAIMED' },
        { deliveryStatus: 'ACCOUNT_BOUND' },
    ])('does not finish an inconsistent delivery response: %j', async invalid => {
        vi.mocked(apiFetch).mockImplementation(async endpoint =>
            endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT ? response(context) : response({ ...delivery, ...invalid })
        );
        await expect(purchaseAppleSubscription(createLoggedInStore())).rejects.toThrow();
        expect(postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'finish' }));
        expect(apiFetch).toHaveBeenCalledTimes(2);
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });

    it('finishes delivered purchases while renewal bonus verification remains pending', async () => {
        vi.mocked(apiFetch).mockImplementation(async endpoint => {
            if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) return response(context);
            if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) {
                return response({ ...delivery, bonusStatus: 'PENDING', financialStatus: 'PAID' });
            }
            return response({ subscriptions });
        });
        const store = createLoggedInStore();
        await expect(purchaseAppleSubscription(store)).resolves.toBe('purchased');
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: [transaction.id] });
        expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(subscriptions[0].expires);
        expect(rmgRuntime.postEvent).toHaveBeenCalledOnce();
    });

    it('stops a restore batch at the rate limit and preserves remaining transactions', async () => {
        const restored = [transaction, { ...transaction, id: 'second' }, { ...transaction, id: 'third' }];
        postMessage.mockImplementation(nativeResult({ status: 'restored', transactions: restored }));
        let submissions = 0;
        vi.mocked(apiFetch).mockImplementation(async endpoint => {
            if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) return response(context);
            if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) {
                submissions++;
                return submissions === 1 ? response(delivery) : response({ message: 'Rate limited' }, 429);
            }
            return response({ subscriptions });
        });
        const store = createLoggedInStore();
        await expect(purchaseAppleSubscription(store)).rejects.toThrow('Too many App Store verification requests');
        expect(submissions).toBe(2);
        expect(postMessage.mock.calls.filter(([message]) => message.type === 'finish')).toEqual([
            [{ type: 'finish', transactionIDs: [transaction.id] }],
        ]);
        expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(subscriptions[0].expires);
    });

    it.each(['cancelled', 'pending'] as const)('does not submit or announce a %s purchase', async status => {
        postMessage.mockImplementation(nativeResult({ status, transactions: [] }));
        await expect(purchaseAppleSubscription(createLoggedInStore())).resolves.toBe(status);
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });

    it('does not verify a purchase against an account selected while the native store was open', async () => {
        const store = createLoggedInStore();
        let completePurchase!: (value: unknown) => void;
        postMessage.mockImplementation(message =>
            message.type === 'configuration'
                ? Promise.resolve(stableConfiguration)
                : new Promise(resolve => {
                      completePurchase = resolve;
                  })
        );
        const purchase = purchaseAppleSubscription(store);
        await waitFor(() => expect(completePurchase).toBeTypeOf('function'));
        store.dispatch(
            login({
                id: 8,
                name: 'Other account',
                email: 'other@example.com',
                token: 'other-token',
                expires: '2099-01-01T00:00:00Z',
                refreshToken: 'refresh-token',
                refreshExpires: '2099-01-02T00:00:00Z',
            })
        );
        completePurchase({ status: 'purchased', transactions: [transaction] });
        await expect(purchase).rejects.toThrow('account changed');
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(postMessage).toHaveBeenCalledTimes(2);
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });

    it('prevents a second purchase UI while the first is still open', async () => {
        const store = createLoggedInStore();
        let closePurchase!: (value: unknown) => void;
        postMessage.mockImplementation(message =>
            message.type === 'configuration'
                ? Promise.resolve(stableConfiguration)
                : new Promise(resolve => {
                      closePurchase = resolve;
                  })
        );
        const purchase = purchaseAppleSubscription(store);
        await waitFor(() => expect(closePurchase).toBeTypeOf('function'));
        await expect(purchaseAppleSubscription(store)).resolves.toBe('cancelled');
        expect(postMessage).toHaveBeenCalledTimes(2);
        closePurchase({ status: 'cancelled', transactions: [] });
        await purchase;
    });

    it('does not announce refunded entitlements as successfully delivered', async () => {
        vi.mocked(apiFetch).mockImplementation(async endpoint => {
            if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) return response(context);
            if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) {
                return response({ ...delivery, deliveryStatus: 'WITHHELD' });
            }
            return response({ subscriptions: [] });
        });
        await purchaseAppleSubscription(createLoggedInStore());
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: [transaction.id] });
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });

    it('delivers other restored purchases when one subscription chain belongs to another account', async () => {
        const store = createLoggedInStore();
        postMessage.mockImplementation(
            nativeResult({
                status: 'restored',
                transactions: [transaction, { ...transaction, id: 'other-chain', signedTransaction: 'other.proof' }],
            })
        );
        vi.mocked(apiFetch).mockImplementation(async (endpoint, init) => {
            if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) return response(context);
            if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) {
                return init?.body === JSON.stringify({ signedTransactionInfo: transaction.signedTransaction })
                    ? response({ message: 'This subscription belongs to another account' }, 409)
                    : response(delivery);
            }
            return response({ subscriptions });
        });
        await expect(purchaseAppleSubscription(store)).rejects.toThrow('belongs to another account');
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: ['other-chain'] });
        expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(subscriptions[0].expires);
        expect(rmgRuntime.postEvent).toHaveBeenCalledOnce();
    });

    it('keeps launch and foreground recovery local when there are no pending transactions', async () => {
        const store = createLoggedInStore();
        postMessage.mockResolvedValue({ hasPendingTransactions: false });
        const dispose = installAppleSubscriptions(store);
        try {
            await act(async () => {});
            expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });
            expect(checkTokenAndRefresh).not.toHaveBeenCalled();
            expect(apiFetch).not.toHaveBeenCalled();

            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
            await act(async () => {
                document.dispatchEvent(new Event('visibilitychange'));
            });

            expect(postMessage.mock.calls).toEqual([
                [{ type: 'hasPendingTransactions' }],
                [{ type: 'hasPendingTransactions' }],
            ]);
            expect(checkTokenAndRefresh).not.toHaveBeenCalled();
            expect(apiFetch).not.toHaveBeenCalled();
            expect(logger.warn).not.toHaveBeenCalled();
            expect(store.getState().account.isLoggedIn).toBe(true);
        } finally {
            dispose();
        }
    });

    it.each([null, {}, { hasPendingTransactions: 'true' }, { hasPendingTransactions: 1 }])(
        'does not request account or IAP data for an invalid pending-transaction reply: %j',
        async reply => {
            postMessage.mockResolvedValue(reply);
            const dispose = installAppleSubscriptions(createLoggedInStore());
            try {
                await waitFor(() => expect(logger.warn).toHaveBeenCalledOnce());
                expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });
                expect(checkTokenAndRefresh).not.toHaveBeenCalled();
                expect(apiFetch).not.toHaveBeenCalled();
            } finally {
                dispose();
            }
        }
    );

    it('does not request account or IAP data when the local pending-transaction check fails', async () => {
        postMessage.mockRejectedValue(new Error('The native transaction queue is unavailable.'));
        const dispose = installAppleSubscriptions(createLoggedInStore());
        try {
            await waitFor(() => expect(logger.warn).toHaveBeenCalledOnce());
            expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });
            expect(checkTokenAndRefresh).not.toHaveBeenCalled();
            expect(apiFetch).not.toHaveBeenCalled();
        } finally {
            dispose();
        }
    });

    it('leaves recovery idle when a purchase starts during the local queue check', async () => {
        const store = createLoggedInStore();
        let completeCheck!: (reply: unknown) => void;
        let completePurchase: ((reply: unknown) => void) | undefined;
        postMessage.mockImplementation(async message => {
            if (message.type === 'hasPendingTransactions') {
                return new Promise(resolve => {
                    completeCheck = resolve;
                });
            }
            if (message.type === 'configuration') return stableConfiguration;
            if (message.type === 'purchase') {
                return new Promise(resolve => {
                    completePurchase = resolve;
                });
            }
            return {};
        });
        const dispose = installAppleSubscriptions(store);
        let purchase: ReturnType<typeof purchaseAppleSubscription> | undefined;
        try {
            await waitFor(() => expect(completeCheck).toBeTypeOf('function'));
            purchase = purchaseAppleSubscription(store);
            await waitFor(() => expect(completePurchase).toBeTypeOf('function'));

            await act(async () => {
                completeCheck({ hasPendingTransactions: true });
            });

            expect(checkTokenAndRefresh).not.toHaveBeenCalled();
            expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
                API_ENDPOINT.APPLE_IAP_CONTEXT,
                expect.anything(),
                'account-token'
            );
            expect(postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recover' }));
        } finally {
            dispose();
            completePurchase?.({ status: 'cancelled', transactions: [] });
            await purchase;
        }
    });

    it.each(['disposed', 'logged out', 'account changed'])(
        'stops a delayed local queue check after the recovery is %s',
        async interruption => {
            const store = createLoggedInStore();
            let completeCheck!: (reply: unknown) => void;
            postMessage
                .mockImplementationOnce(
                    () =>
                        new Promise(resolve => {
                            completeCheck = resolve;
                        })
                )
                .mockResolvedValue({ hasPendingTransactions: false });
            const dispose = installAppleSubscriptions(store);
            try {
                await waitFor(() => expect(completeCheck).toBeTypeOf('function'));
                await act(async () => {
                    if (interruption === 'disposed') dispose();
                    else if (interruption === 'logged out') store.dispatch(logout());
                    else store.dispatch(login(loginInfo));
                    completeCheck({ hasPendingTransactions: true });
                });

                expect(checkTokenAndRefresh).not.toHaveBeenCalled();
                expect(apiFetch).not.toHaveBeenCalled();
                expect(postMessage.mock.calls.every(([message]) => message.type === 'hasPendingTransactions')).toBe(
                    true
                );
            } finally {
                dispose();
            }
        }
    );

    it('waits for a forced token refresh when foreground recovery finds pending transactions', async () => {
        const store = createLoggedInStore();
        postMessage.mockImplementation(emptyRecovery);
        const dispose = installAppleSubscriptions(store);
        try {
            await waitFor(() => expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'recover' })));
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');

            for (const token of ['first-refreshed-token', 'second-refreshed-token']) {
                let completeRefresh!: () => void;
                vi.mocked(checkTokenAndRefresh).mockImplementationOnce(
                    () =>
                        new Promise(resolve => {
                            completeRefresh = () => {
                                store.dispatch(setToken({ access: token, refresh: `refresh-${token}` }));
                                resolve();
                            };
                        })
                );
                vi.mocked(apiFetch).mockClear();
                postMessage.mockClear();

                document.dispatchEvent(new Event('visibilitychange'));
                await waitFor(() => expect(completeRefresh).toBeTypeOf('function'));
                expect(checkTokenAndRefresh).toHaveBeenLastCalledWith(store, true);
                expect(apiFetch).not.toHaveBeenCalled();
                expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });

                completeRefresh();
                await waitFor(() =>
                    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'recover' }))
                );
                expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
                    API_ENDPOINT.APPLE_IAP_CONTEXT,
                    expect.anything(),
                    token
                );
                expect(store.getState().account.isLoggedIn).toBe(true);
            }
        } finally {
            dispose();
        }
    });

    it.each([200, 401])('ignores an older recovery response (%s) and refreshes before retrying IAP', async status => {
        const store = createLoggedInStore();
        let completeContext!: (value: Response) => void;
        vi.mocked(apiFetch).mockImplementationOnce(
            () =>
                new Promise(resolve => {
                    completeContext = resolve;
                })
        );
        postMessage.mockImplementation(emptyRecovery);
        const dispose = installAppleSubscriptions(store);
        try {
            await waitFor(() => expect(completeContext).toBeTypeOf('function'));
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
            document.dispatchEvent(new Event('visibilitychange'));
            expect(checkTokenAndRefresh).toHaveBeenCalledTimes(1);

            vi.mocked(checkTokenAndRefresh).mockImplementationOnce(async () => {
                store.dispatch(setToken({ access: 'queued-refresh-token', refresh: 'queued-refresh' }));
            });
            completeContext(response(context, status));

            await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
            expect(checkTokenAndRefresh).toHaveBeenLastCalledWith(store, true);
            expect(apiFetch).toHaveBeenLastCalledWith(
                API_ENDPOINT.APPLE_IAP_CONTEXT,
                expect.anything(),
                'queued-refresh-token'
            );
            await waitFor(() =>
                expect(postMessage.mock.calls.filter(([message]) => message.type === 'recover')).toHaveLength(1)
            );
            expect(store.getState().account.isLoggedIn).toBe(true);
            expect(logger.warn).not.toHaveBeenCalled();
        } finally {
            dispose();
        }
    });

    it('does not request IAP context when foreground token refresh ends the account session', async () => {
        const store = createLoggedInStore();
        postMessage.mockImplementation(emptyRecovery);
        const dispose = installAppleSubscriptions(store);
        try {
            await waitFor(() => expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'recover' })));
            vi.mocked(apiFetch).mockClear();
            postMessage.mockClear();
            vi.mocked(checkTokenAndRefresh).mockImplementationOnce(async () => {
                store.dispatch(logout());
            });
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');

            document.dispatchEvent(new Event('visibilitychange'));

            await waitFor(() => expect(logger.warn).toHaveBeenCalledOnce());
            expect(checkTokenAndRefresh).toHaveBeenLastCalledWith(store, true);
            expect(apiFetch).not.toHaveBeenCalled();
            expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });
            expect(store.getState().account.isLoggedIn).toBe(false);
        } finally {
            dispose();
        }
    });

    it('stops IAP recovery when disposed during a foreground token refresh', async () => {
        const store = createLoggedInStore();
        postMessage.mockImplementation(emptyRecovery);
        const dispose = installAppleSubscriptions(store);
        try {
            await waitFor(() => expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'recover' })));
            let completeRefresh!: () => void;
            vi.mocked(checkTokenAndRefresh).mockImplementationOnce(
                () =>
                    new Promise(resolve => {
                        completeRefresh = resolve;
                    })
            );
            vi.mocked(apiFetch).mockClear();
            postMessage.mockClear();
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
            document.dispatchEvent(new Event('visibilitychange'));
            await waitFor(() => expect(completeRefresh).toBeTypeOf('function'));

            dispose();
            completeRefresh();
            await Promise.resolve();

            expect(apiFetch).not.toHaveBeenCalled();
            expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });
        } finally {
            dispose();
        }
    });

    it('ignores background visibility changes without refreshing tokens or requesting IAP', async () => {
        const store = createLoggedInStore();
        postMessage.mockImplementation(emptyRecovery);
        const dispose = installAppleSubscriptions(store);
        try {
            await waitFor(() => expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'recover' })));
            vi.mocked(checkTokenAndRefresh).mockClear();
            vi.mocked(apiFetch).mockClear();
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

            document.dispatchEvent(new Event('visibilitychange'));

            expect(checkTokenAndRefresh).not.toHaveBeenCalled();
            expect(apiFetch).not.toHaveBeenCalled();
        } finally {
            dispose();
        }
    });

    it.each(['PRODUCTION', 'SANDBOX'])(
        'recovers an interrupted %s transaction from the shared server without opening a purchase UI',
        async environment => {
            const store = createLoggedInStore();
            postMessage.mockImplementation(async message =>
                message.type === 'hasPendingTransactions'
                    ? { hasPendingTransactions: true }
                    : message.type === 'configuration'
                      ? { ...stableConfiguration, environment }
                      : message.type === 'recover'
                        ? { transactions: [{ ...transaction, environment }] }
                        : {}
            );
            vi.mocked(apiFetch).mockImplementation(async endpoint => {
                if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) {
                    return response({ ...context, allowedEnvironments: ['PRODUCTION', 'SANDBOX'] });
                }
                if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS) return response({ ...delivery, environment });
                return response({ subscriptions });
            });
            const dispose = installAppleSubscriptions(store);
            try {
                await waitFor(() => expect(rmgRuntime.postEvent).toHaveBeenCalledOnce());
                expect(postMessage).toHaveBeenCalledWith({
                    type: 'recover',
                    productIDs: ['subscription_ultimate'],
                    allowedEnvironments: [environment],
                });
                expect(postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'purchase' }));
                expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: [transaction.id] });
            } finally {
                dispose();
            }
        }
    );

    it('does not submit a production transaction recovered by a TestFlight install', async () => {
        const store = createLoggedInStore();
        postMessage.mockImplementation(async message =>
            message.type === 'hasPendingTransactions'
                ? { hasPendingTransactions: true }
                : message.type === 'configuration'
                  ? { channel: 'testflight', environment: 'SANDBOX' }
                  : message.type === 'recover'
                    ? { transactions: [transaction] }
                    : {}
        );
        vi.mocked(apiFetch).mockResolvedValue(response({ ...context, allowedEnvironments: ['PRODUCTION', 'SANDBOX'] }));
        const dispose = installAppleSubscriptions(store);
        try {
            await waitFor(() => expect(logger.warn).toHaveBeenCalledOnce());
            expect(postMessage).toHaveBeenCalledWith({
                type: 'recover',
                productIDs: ['subscription_ultimate'],
                allowedEnvironments: ['SANDBOX'],
            });
            expect(apiFetch).toHaveBeenCalledTimes(1);
            expect(postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'finish' }));
            expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
        } finally {
            dispose();
        }
    });

    it('recovers a TestFlight transaction update after launch found no pending transactions', async () => {
        const store = createLoggedInStore();
        let updated = false;
        postMessage.mockImplementation(async message =>
            message.type === 'hasPendingTransactions'
                ? { hasPendingTransactions: updated }
                : message.type === 'configuration'
                  ? { channel: 'testflight', environment: 'SANDBOX' }
                  : message.type === 'recover'
                    ? { transactions: updated ? [{ ...transaction, environment: 'SANDBOX' }] : [] }
                    : {}
        );
        vi.mocked(apiFetch).mockImplementation(async endpoint => {
            if (endpoint === API_ENDPOINT.APPLE_IAP_CONTEXT) {
                return response({ ...context, allowedEnvironments: ['SANDBOX'] });
            }
            if (endpoint === API_ENDPOINT.APPLE_IAP_TRANSACTIONS)
                return response({ ...delivery, environment: 'SANDBOX' });
            return response({ subscriptions });
        });
        const dispose = installAppleSubscriptions(store);
        try {
            await act(async () => {});
            expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hasPendingTransactions' });
            expect(checkTokenAndRefresh).not.toHaveBeenCalled();
            expect(apiFetch).not.toHaveBeenCalled();
            updated = true;
            window.dispatchEvent(new CustomEvent('rmt-apple-transaction'));
            await waitFor(() => expect(rmgRuntime.postEvent).toHaveBeenCalledOnce());
            expect(postMessage.mock.calls.filter(([message]) => message.type === 'configuration')).toHaveLength(1);
            expect(postMessage.mock.calls.filter(([message]) => message.type === 'recover')).toEqual([
                [{ type: 'recover', productIDs: ['subscription_ultimate'], allowedEnvironments: ['SANDBOX'] }],
            ]);
            expect(postMessage).toHaveBeenLastCalledWith({ type: 'finish', transactionIDs: [transaction.id] });
        } finally {
            dispose();
        }
    });
});
