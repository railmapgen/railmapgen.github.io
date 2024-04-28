import { LocalStorageKey, QUERY_STRINGS, WorkspaceTab } from '../util/constants';
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
import rmgRuntime from '@railmapgen/rmg-runtime';
import { checkInstance } from '../util/instance-checker';
import { clearAllListeners } from '@reduxjs/toolkit';
import { assetEnablement, getAllowedAssetTypes, getAvailableAsset } from '../util/asset-enablements';
import { isSafari } from '../util/utils';

export const initShowDevtools = (store: RootStore) => {
    const lastShowDevTools = Number(rmgRuntime.storage.get(LocalStorageKey.LAST_SHOW_DEVTOOLS));
    if (lastShowDevTools) {
        store.dispatch(showDevtools(lastShowDevTools));
    }
};

export const initOpenedTabs = (store: RootStore) => {
    try {
        // opened tabs
        const openedTabsString = window.localStorage.getItem(LocalStorageKey.OPENED_TABS);

        if (openedTabsString) {
            const openedTabs = JSON.parse(openedTabsString);
            if (Array.isArray(openedTabs)) {
                const allowedAssetTypes = getAllowedAssetTypes(isShowDevtools(store.getState().app.lastShowDevtools));
                const nextOpenTabs = (openedTabs as WorkspaceTab[]).filter(tab =>
                    allowedAssetTypes.includes(assetEnablement[tab.app].assetType)
                );
                store.dispatch(setOpenedTabs(nextOpenTabs));
            } else {
                console.warn('initOpenedTabs():: Cannot parse invalid opened tabs state from local storage');
            }
        }
    } catch (e) {
        console.warn('initOpenedTabs():: cannot parse opened apps state from local storage', e);
    }
};

export const initActiveTab = (store: RootStore) => {
    const activeTab = window.localStorage.getItem(LocalStorageKey.ACTIVE_TAB);
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
    console.log(
        `openSearchedApp():: searchParams app=${appSearched}, extraSearchParams are [${extraSearchParams}], extraHashParams are [${extraHashParams}]`
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
        console.warn(`openSearchedApp():: app ${appSearched} not found`);
    }
};

export default function initStore(store: RootStore) {
    initShowDevtools(store);
    initOpenedTabs(store);
    initActiveTab(store);

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
            window.localStorage.setItem(
                LocalStorageKey.OPENED_TABS,
                JSON.stringify(listenerApi.getState().app.openedTabs)
            );
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return currentState.app.activeTab !== previousState.app.activeTab;
        },
        effect: (_action, listenerApi) => {
            const activeApp = listenerApi.getState().app.activeTab;
            activeApp !== undefined && window.localStorage.setItem(LocalStorageKey.ACTIVE_TAB, activeApp);
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
