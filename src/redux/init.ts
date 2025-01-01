import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { clearAllListeners } from '@reduxjs/toolkit';
import { assetEnablement, getAllowedAssetTypes, getAvailableAsset } from '../util/asset-enablements';
import { LocalStorageKey, QUERY_STRINGS, WorkspaceTab } from '../util/constants';
import { checkInstance } from '../util/instance-checker';
import { isSafari, refreshToken } from '../util/utils';
import { LoginInfo, login, logout, setExpires, setToken } from './account/account-slice';
import {
    isShowDevtools,
    neverShowFontAdvice,
    openApp,
    setActiveTab,
    setIsPrimary,
    setOpenedTabs,
    showDevtools,
} from './app/app-slice';
import { RootStore, startRootListening } from './index';
import { SaveState, setLastChangedAtTimeStamp } from './save/save-slice';

export const initShowDevtools = (store: RootStore) => {
    const lastShowDevTools = Number(rmgRuntime.storage.get(LocalStorageKey.LAST_SHOW_DEVTOOLS));
    if (lastShowDevTools) {
        store.dispatch(showDevtools(lastShowDevTools));
    }
};

export const initOpenedTabs = (store: RootStore) => {
    try {
        // opened tabs
        const openedTabsString = rmgRuntime.storage.get(LocalStorageKey.OPENED_TABS);

        if (openedTabsString) {
            const openedTabs = JSON.parse(openedTabsString);
            if (Array.isArray(openedTabs)) {
                const allowedAssetTypes = getAllowedAssetTypes(isShowDevtools(store.getState().app.lastShowDevtools));
                const nextOpenTabs = (openedTabs as WorkspaceTab[]).filter(tab =>
                    allowedAssetTypes.includes(assetEnablement[tab.app].assetType)
                );
                store.dispatch(setOpenedTabs(nextOpenTabs));
            } else {
                logger.warn('initOpenedTabs(), Cannot parse invalid opened tabs state from local storage');
            }
        }
    } catch (e) {
        logger.warn('initOpenedTabs(), cannot parse opened apps state from local storage', e);
    }
};

export const initActiveTab = (store: RootStore) => {
    const activeTab = rmgRuntime.storage.get(LocalStorageKey.ACTIVE_TAB);
    const openedTabs = store.getState().app.openedTabs;
    if (activeTab && openedTabs.some(({ id }) => id === activeTab)) {
        store.dispatch(setActiveTab(activeTab));
    } else {
        store.dispatch(setActiveTab(openedTabs[0]?.id));
    }
};

export const openSearchedApp = (store: RootStore) => {
    const searchParams = new URLSearchParams(window.location.search);
    const appSearched = searchParams.get(QUERY_STRINGS.APP) ?? '';
    const extraSearchParams = searchParams.get(QUERY_STRINGS.SEARCH_PARAMS) ?? undefined;
    const extraHashParams = searchParams.get(QUERY_STRINGS.HASH_PARAMS) ?? undefined;
    logger.info(
        `openSearchedApp(), searchParams app=${appSearched}, extraSearchParams are [${extraSearchParams}], extraHashParams are [${extraHashParams}]`
    );

    const allowedAssetTypes = getAllowedAssetTypes(isShowDevtools(store.getState().app.lastShowDevtools));
    const allowedApps = allowedAssetTypes
        .map(type => getAvailableAsset(type, rmgRuntime.getEnv(), rmgRuntime.getInstance()))
        .flat();
    if (allowedApps.includes(appSearched)) {
        store.dispatch(
            openApp({
                appId: appSearched,
                search: extraSearchParams,
                hash: extraHashParams,
            })
        );
    } else {
        logger.warn(`openSearchedApp(), app ${appSearched} not found`);
    }
};

export const initAccountStore = (store: RootStore) => {
    const accountString = window.localStorage.getItem(LocalStorageKey.ACCOUNT);

    if (accountString) {
        const accountData = JSON.parse(accountString) as LoginInfo;
        logger.debug(`Get account data from local storage: ${JSON.stringify(accountData)}`);
        store.dispatch(login(accountData));
    }

    // TODO: only run when the token expires
    const intervalMS = 5000;
    setInterval(() => {
        const account = store.getState().account;
        if (!account.isLoggedIn) return;
        const expires = new Date(account.expires!);
        // logger.debug(`Current time: ${new Date()}, access token expires time: ${expires}`);
        if (new Date().getTime() > expires.getTime()) {
            logger.debug(`Token expires on ${expires} needs to be refreshed on ${new Date()}`);
            const refreshExpires = new Date(account.refreshExpires!);
            if (new Date().getTime() > refreshExpires.getTime()) {
                logger.debug(`Refresh token expires on ${refreshExpires}, logout!`);
                store.dispatch(logout());
                return;
            }
            refreshToken(account.refreshToken!).then(refresh => {
                logger.debug(`Token refreshed with ${JSON.stringify(refresh)}`);
                if (!refresh) {
                    store.dispatch(logout());
                    return;
                }
                store.dispatch(setToken({ access: refresh.access.token, refresh: refresh.refresh.token }));
                store.dispatch(
                    setExpires({ expires: refresh.access.expires, refreshExpires: refresh.refresh.expires })
                );
            });
        }
    }, intervalMS);
};

export const initSaveStore = (store: RootStore) => {
    const saveString = window.localStorage.getItem(LocalStorageKey.SAVE);

    if (saveString) {
        const saveData = JSON.parse(saveString) as Pick<SaveState, 'lastChangedAtTimeStamp'>;
        logger.debug(`Get save data from local storage: ${JSON.stringify(saveData)}`);
        store.dispatch(setLastChangedAtTimeStamp(saveData.lastChangedAtTimeStamp));
    } else {
        // Default to 0 on fresh start and will be overwritten on login.
        // (cloud lastUpdateAt must be greater than lastChangedAt(0))
        logger.warn('No save data from local storage. Setting lastChangedAtTimeStamp to 0.');
        store.dispatch(setLastChangedAtTimeStamp(0));
    }
};

export default function initStore(store: RootStore) {
    initShowDevtools(store);
    initOpenedTabs(store);
    initActiveTab(store);
    initAccountStore(store);
    initSaveStore(store);

    if (isSafari() || rmgRuntime.storage.get(LocalStorageKey.SHOW_FONT_ADVICE) === 'never') {
        store.dispatch(neverShowFontAdvice());
    }

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return currentState.app.lastShowDevtools !== previousState.app.lastShowDevtools;
        },
        effect: (_action, listenerApi) => {
            rmgRuntime.storage.set(
                LocalStorageKey.LAST_SHOW_DEVTOOLS,
                listenerApi.getState().app.lastShowDevtools.toString()
            );
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return JSON.stringify(currentState.app.openedTabs) !== JSON.stringify(previousState.app.openedTabs);
        },
        effect: (_action, listenerApi) => {
            rmgRuntime.storage.set(LocalStorageKey.OPENED_TABS, JSON.stringify(listenerApi.getState().app.openedTabs));
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return currentState.app.activeTab !== previousState.app.activeTab;
        },
        effect: (_action, listenerApi) => {
            const activeApp = listenerApi.getState().app.activeTab;
            if (activeApp !== undefined) rmgRuntime.storage.set(LocalStorageKey.ACTIVE_TAB, activeApp);
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return currentState.account.isLoggedIn !== previousState.account.isLoggedIn;
        },
        effect: (_action, listenerApi) => {
            const { isLoggedIn, id, name, email, token, expires, refreshToken, refreshExpires } =
                listenerApi.getState().account;
            if (isLoggedIn) {
                window.localStorage.setItem(
                    LocalStorageKey.ACCOUNT,
                    JSON.stringify({ id, name, email, token, expires, refreshToken, refreshExpires })
                );
            } else {
                logger.debug(`Remove account from local storage due to logout.`);
                window.localStorage.removeItem(LocalStorageKey.ACCOUNT);
            }
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return currentState.save.lastChangedAtTimeStamp !== previousState.save.lastChangedAtTimeStamp;
        },
        effect: (_action, listenerApi) => {
            const { lastChangedAtTimeStamp } = listenerApi.getState().save;
            window.localStorage.setItem(LocalStorageKey.SAVE, JSON.stringify({ lastChangedAtTimeStamp }));
        },
    });

    openSearchedApp(store);

    checkInstance().then(isPrimary => {
        store.dispatch(setIsPrimary(isPrimary));
        if (!isPrimary) {
            store.dispatch(clearAllListeners());
        }
    });
}
