import { AppId, LocalStorageKey } from '../util/constants';
import { setActiveApp, setOpenedApps } from './app/app-slice';
import { startRootListening } from './index';
import { Store } from '@reduxjs/toolkit';

export default function initStore(store: Store) {
    try {
        // opened apps
        const openedAppsString = window.localStorage.getItem(LocalStorageKey.OPENED_APPS);
        if (openedAppsString) {
            const openedApps = JSON.parse(openedAppsString);
            if (Array.isArray(openedApps)) {
                store.dispatch(setOpenedApps(openedApps));
            } else {
                console.warn('initStore():: cannot parse invalid opened apps state from local storage');
            }
        }
    } catch (e) {
        console.warn('initStore():: cannot parse opened apps state from local storage', e);
    }

    // active app
    const activeApp = window.localStorage.getItem(LocalStorageKey.ACTIVE_APP);
    if (activeApp) {
        store.dispatch(setActiveApp(activeApp as AppId));
    }

    startRootListening({
        predicate: (action, currentState, previousState) => {
            return currentState.app.openedApps.toString() !== previousState.app.openedApps.toString();
        },
        effect: (action, listenerApi) => {
            window.localStorage.setItem(
                LocalStorageKey.OPENED_APPS,
                JSON.stringify(listenerApi.getState().app.openedApps)
            );
        },
    });

    startRootListening({
        predicate: (action, currentState, previousState) => {
            return currentState.app.activeApp !== previousState.app.activeApp;
        },
        effect: (action, listenerApi) => {
            const activeApp = listenerApi.getState().app.activeApp;
            activeApp !== undefined && window.localStorage.setItem(LocalStorageKey.ACTIVE_APP, activeApp);
        },
    });
}
