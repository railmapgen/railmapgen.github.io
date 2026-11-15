import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import type { RootStore } from '../redux';
import { fetchSubscription, logout } from '../redux/account/account-slice';
import { setAccountPage, setIsRedeemModalOpen, setMenuOpen, setMenuView } from '../redux/app/app-slice';
import {
    AppleEnvironment,
    AppleSubscriptionBridge,
    apiFetch,
    checkTokenAndRefresh,
    getAppleConfiguration,
    getAppleSubscriptionBridge,
} from './api';
import { API_ENDPOINT, FRAME_ID_PREFIX } from './constants';

// Shared wire names with RMP; both apps use the existing runtime channel.
export const OPEN_SUBSCRIPTION_REDEMPTION = 'OPEN_SUBSCRIPTION_REDEMPTION';
export const SUBSCRIPTION_REDEEMED = 'SUBSCRIPTION_REDEEMED';

export const registerSubscriptionRedemption = (store: RootStore) => {
    rmgRuntime.onMessage(OPEN_SUBSCRIPTION_REDEMPTION, (_data, frameId) => {
        const { app, account } = store.getState();
        if (app.isPrimary !== true || app.isTerminated || !frameId) return;
        if (!app.openedTabs.some(tab => FRAME_ID_PREFIX + tab.id === frameId)) return;
        if (!(document.getElementById(frameId) instanceof HTMLIFrameElement)) return;

        store.dispatch(setMenuOpen(true));
        store.dispatch(setMenuView('account'));
        store.dispatch(setAccountPage('login'));
        store.dispatch(setIsRedeemModalOpen(account.isLoggedIn));
        rmgRuntime.toggleNavMenu(true);

        if (!account.isLoggedIn) {
            requestAnimationFrame(() => document.getElementById('rmt-login-email')?.focus());
        }
    });
};

interface AppleTransaction {
    id: string;
    productID: string;
    signedTransaction: string;
    environment: AppleEnvironment;
}

interface PurchaseResult {
    status: 'purchased' | 'restored' | 'cancelled' | 'pending';
    transactions: AppleTransaction[];
}

interface SubscriptionContext {
    enabled: boolean;
    claimRequired: boolean;
    subscriptionGroupId: string | null;
    products: { productId: string }[];
    allowedEnvironments: AppleEnvironment[];
}

interface TransactionDelivery {
    environment: AppleEnvironment;
    claimRequired: boolean;
    deliveryStatus: 'DELIVERED' | 'WITHHELD' | 'UNCLAIMED' | 'ACCOUNT_BOUND';
    finishAllowed: boolean;
}

class SubscriptionRateLimitError extends Error {
    constructor() {
        super('Too many App Store verification requests. Please try again later.');
    }
}

class SubscriptionUnavailableError extends Error {
    constructor() {
        super('App Store subscriptions are not available yet. Please try again later.');
    }
}

class SubscriptionRecoverySupersededError extends Error {}

const accountSession = (store: RootStore) => {
    const { isLoggedIn, id, token } = store.getState().account;
    if (!isLoggedIn || id === undefined || !token) throw new Error('Login status expired.');
    return { id, token };
};

const assertAccount = (store: RootStore, userId: number) => {
    const session = accountSession(store);
    if (session.id !== userId) throw new Error('Your account changed. Please try again.');
    return session;
};

const readResponse = async (response: Response, store: RootStore, userId: number) => {
    assertAccount(store, userId);
    if (response.status === 401) {
        store.dispatch(logout());
        throw new Error('Login status expired.');
    }
    if (response.status === 429) throw new SubscriptionRateLimitError();
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Unable to verify your App Store purchase. Please try again.');
    }
    return response.json();
};

const loadContext = async (store: RootStore, bridge: AppleSubscriptionBridge, assertCurrent = () => {}) => {
    const { id, token } = accountSession(store);
    // An existing account server can operate without IAP routes. Check its
    // capability before authorizing purchases or loading signed transactions.
    const response = await apiFetch(API_ENDPOINT.APPLE_IAP_CONTEXT, { signal: AbortSignal.timeout(15000) }, token);
    assertCurrent();
    if (response.status === 404) throw new SubscriptionUnavailableError();
    const context: SubscriptionContext = await readResponse(response, store, id);
    if (!context.enabled || context.claimRequired || !context.subscriptionGroupId || !context.products?.length) {
        throw new SubscriptionUnavailableError();
    }
    const productIDs = context.products.map(product => product.productId);
    if (productIDs.some(productID => typeof productID !== 'string' || !productID)) {
        throw new Error('App Store subscriptions are not available yet. Please try again later.');
    }
    if (
        !Array.isArray(context.allowedEnvironments) ||
        !context.allowedEnvironments.length ||
        context.allowedEnvironments.some(environment => !['PRODUCTION', 'SANDBOX'].includes(environment))
    ) {
        throw new Error('The subscription server environment does not match the App Store environment.');
    }
    const configuration = await getAppleConfiguration(bridge);
    assertCurrent();
    assertAccount(store, id);
    if (!context.allowedEnvironments.includes(configuration.environment)) {
        throw new Error('The subscription server environment does not match the App Store environment.');
    }
    return {
        userId: id,
        productIDs,
        subscriptionGroupID: context.subscriptionGroupId,
        configuration,
        allowedEnvironments: [configuration.environment],
    };
};

const isTransaction = (value: unknown): value is AppleTransaction => {
    if (!value || typeof value !== 'object') return false;
    const transaction = value as AppleTransaction;
    return (
        typeof transaction.id === 'string' &&
        !!transaction.id &&
        typeof transaction.productID === 'string' &&
        typeof transaction.signedTransaction === 'string' &&
        !!transaction.signedTransaction &&
        ['PRODUCTION', 'SANDBOX'].includes(transaction.environment)
    );
};

const validateTransactions = (transactions: unknown, environment: AppleEnvironment, productIDs: string[]) => {
    if (!Array.isArray(transactions) || !transactions.every(isTransaction)) {
        throw new Error('Unable to verify your App Store purchase. Please try again.');
    }
    if (transactions.some(transaction => transaction.environment !== environment)) {
        throw new Error('The App Store purchase environment does not match this build.');
    }
    if (transactions.some(transaction => !productIDs.includes(transaction.productID))) {
        throw new Error('Unable to verify your App Store purchase. Please try again.');
    }
    return transactions;
};

const deliverTransactions = async (store: RootStore, userId: number, transactions: AppleTransaction[]) => {
    let delivered = false;
    let refreshNeeded = false;
    let deliveryError: unknown;
    for (const transaction of transactions) {
        const { token } = assertAccount(store, userId);
        try {
            const response = await apiFetch(
                API_ENDPOINT.APPLE_IAP_TRANSACTIONS,
                {
                    method: 'POST',
                    body: JSON.stringify({ signedTransactionInfo: transaction.signedTransaction }),
                    // Certificate checks alone can take 30 seconds on the server.
                    signal: AbortSignal.timeout(90000),
                },
                token
            );
            const result = (await readResponse(response, store, userId)) as TransactionDelivery | null;
            if (result?.environment !== transaction.environment) {
                throw new Error('The subscription server environment does not match the App Store environment.');
            }
            if (
                result.finishAllowed !== true ||
                result.claimRequired !== false ||
                !['DELIVERED', 'WITHHELD'].includes(result.deliveryStatus)
            ) {
                throw new Error('Your purchase is awaiting verification. Please try restoring purchases later.');
            }
            refreshNeeded = true;
            delivered ||= result.deliveryStatus === 'DELIVERED';
            // The server can canonicalize restored IDs. Finish the local proof's ID.
            await getAppleSubscriptionBridge().postMessage({ type: 'finish', transactionIDs: [transaction.id] });
        } catch (error) {
            if (error instanceof SubscriptionRateLimitError) {
                deliveryError = error;
                break;
            }
            // One conflicting subscription chain must not block other restored purchases.
            deliveryError ??= error;
        }
        assertAccount(store, userId);
    }
    if (refreshNeeded) {
        assertAccount(store, userId);
        await store.dispatch(fetchSubscription());
        assertAccount(store, userId);
        if (delivered) rmgRuntime.postEvent(SUBSCRIPTION_REDEEMED, undefined);
    }
    if (deliveryError) throw deliveryError;
    return delivered;
};

let purchaseInProgress = false;

export const purchaseAppleSubscription = async (store: RootStore): Promise<PurchaseResult['status']> => {
    if (purchaseInProgress) return 'cancelled';
    purchaseInProgress = true;
    try {
        const bridge = getAppleSubscriptionBridge();
        const { userId, configuration, ...context } = await loadContext(store, bridge);
        assertAccount(store, userId);
        const result = (await bridge.postMessage({
            type: 'purchase',
            ...context,
            language: rmgRuntime.getLanguage(),
        })) as PurchaseResult;
        if (!result || !['purchased', 'restored', 'cancelled', 'pending'].includes(result.status)) {
            throw new Error('Unable to open App Store subscriptions.');
        }
        if (result.status === 'cancelled' || result.status === 'pending') return result.status;
        const transactions = validateTransactions(result.transactions, configuration.environment, context.productIDs);
        await deliverTransactions(store, userId, transactions);
        return result.status;
    } finally {
        purchaseInProgress = false;
    }
};

/** Recover unfinished purchases on demand without opening a payment UI. */
export const installAppleSubscriptions = (store: RootStore) => {
    if (rmgRuntime.getInstance() !== 'AppStore') return () => {};
    let recovering = false;
    let recoverAgain = false;
    let refreshBeforeRecovery = false;
    let recoveryGeneration = 0;
    let disposed = false;
    const recover = async () => {
        if (disposed || purchaseInProgress || !store.getState().account.isLoggedIn) return;
        if (recovering) {
            recoverAgain = true;
            return;
        }
        recovering = true;
        const generation = recoveryGeneration;
        const assertCurrentRecovery = () => {
            if (disposed || generation !== recoveryGeneration) throw new SubscriptionRecoverySupersededError();
        };
        try {
            const { id: initialUserId } = accountSession(store);
            const forceRefresh = refreshBeforeRecovery;
            refreshBeforeRecovery = false;
            // Most launches have nothing to recover. Check StoreKit's unfinished
            // queue before refreshing credentials or contacting the IAP backend.
            const bridge = getAppleSubscriptionBridge();
            const pending = (await bridge.postMessage({ type: 'hasPendingTransactions' })) as {
                hasPendingTransactions?: unknown;
            } | null;
            assertCurrentRecovery();
            assertAccount(store, initialUserId);
            if (purchaseInProgress) return;
            if (typeof pending?.hasPendingTransactions !== 'boolean') {
                throw new Error('Unable to check unfinished App Store purchases.');
            }
            if (!pending.hasPendingTransactions) return;
            // Foreground recovery must wait for fresh credentials before any IAP request.
            await checkTokenAndRefresh(store, forceRefresh);
            if (purchaseInProgress) return;
            assertCurrentRecovery();
            assertAccount(store, initialUserId);
            const { userId, productIDs, allowedEnvironments, configuration } = await loadContext(
                store,
                bridge,
                assertCurrentRecovery
            );
            assertAccount(store, userId);
            if (purchaseInProgress) return;
            const result = (await bridge.postMessage({ type: 'recover', productIDs, allowedEnvironments })) as {
                transactions: AppleTransaction[];
            };
            assertCurrentRecovery();
            const transactions = validateTransactions(result?.transactions, configuration.environment, productIDs);
            await deliverTransactions(store, userId, transactions);
        } catch (error) {
            // Leave transactions unfinished so the native store can retry them.
            if (
                !(error instanceof SubscriptionUnavailableError) &&
                !(error instanceof SubscriptionRecoverySupersededError)
            ) {
                logger.warn('Could not recover App Store subscriptions:', error);
            }
        } finally {
            recovering = false;
            if (recoverAgain) {
                recoverAgain = false;
                void recover();
            }
        }
    };
    let previousUserId = store.getState().account.id;
    const unsubscribe = store.subscribe(() => {
        const userId = store.getState().account.id;
        if (userId !== previousUserId) {
            previousUserId = userId;
            void recover();
        }
    });
    const onVisible = () => {
        if (document.visibilityState === 'visible' && store.getState().account.isLoggedIn) {
            recoveryGeneration++;
            refreshBeforeRecovery = true;
            void recover();
        }
    };
    window.addEventListener('rmt-apple-transaction', recover);
    document.addEventListener('visibilitychange', onVisible);
    void recover();
    return () => {
        disposed = true;
        unsubscribe();
        window.removeEventListener('rmt-apple-transaction', recover);
        document.removeEventListener('visibilitychange', onVisible);
    };
};
