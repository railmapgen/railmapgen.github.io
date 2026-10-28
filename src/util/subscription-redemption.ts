import rmgRuntime from '@railmapgen/rmg-runtime';
import type { RootStore } from '../redux';
import { setAccountPage, setIsRedeemModalOpen, setMenuOpen, setMenuView } from '../redux/app/app-slice';
import { FRAME_ID_PREFIX } from './constants';

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
