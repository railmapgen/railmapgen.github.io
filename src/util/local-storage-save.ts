import { logger } from '@railmapgen/rmg-runtime';
import { syncAfterLogin } from '../redux/account/account-slice';
import { createStore } from '../redux/index';
import { apiFetch } from './api';
import { API_ENDPOINT, SAVE_KEY } from './constants';
import { createHash } from './utils';

export const getRMPSave = async (key: SAVE_KEY) => {
    const data = localStorage.getItem(key);
    if (!data) return undefined;
    const hash = await createHash(data);
    return { data, hash };
};
export const setRMPSave = (key: SAVE_KEY, data: string) => {
    localStorage.setItem(key, data);
};

export const SAVE_MANAGER_CHANNEL_NAME = 'rmt-save-manager';
export enum SaveManagerEventType {
    SAVE_CHANGED = 'SAVE_CHANGED',
}
export interface SaveManagerEvent {
    type: SaveManagerEventType;
    key?: SAVE_KEY;
    token?: string;
    from: 'rmp' | 'rmt';
}

const channel = new BroadcastChannel(SAVE_MANAGER_CHANNEL_NAME);

export const notifyRMPSaveChange = () => {
    channel.postMessage({
        type: SaveManagerEventType.SAVE_CHANGED,
        key: SAVE_KEY.RMP,
        from: 'rmt',
    } as SaveManagerEvent);
};

/**
 * Slightly reduce the server load by notifying a sequence of updates once.
 */
let updateSaveTimeout: number | undefined;

const SAVE_UPDATE_TIMEOUT_MS = 60 * 1000; // 1min

export const registerOnRMPSaveChange = (store: ReturnType<typeof createStore>) => {
    const eventHandler = (ev: MessageEvent<SaveManagerEvent>) => {
        const { type, key, from } = ev.data;
        if (type !== SaveManagerEventType.SAVE_CHANGED || from !== 'rmp') {
            return;
        }

        logger.info(`Received save changed event on key: ${key}`);

        if (updateSaveTimeout) {
            return;
        }

        updateSaveTimeout = window.setTimeout(async () => {
            updateSaveTimeout = undefined;

            const { isLoggedIn, token } = store.getState().account;
            if (!isLoggedIn || !token) return;

            logger.info(`Sync save after timeout on key: ${key}`);
            store.dispatch(syncAfterLogin());
        }, SAVE_UPDATE_TIMEOUT_MS);
    };

    channel.addEventListener('message', eventHandler);
};

export const updateSave = async (saveId: number, token: string, key: SAVE_KEY, baseHash?: string) => {
    const save = await getRMPSave(key);
    if (!save) return undefined;
    const { data, hash } = save;
    const response = await apiFetch(
        API_ENDPOINT.SAVES + '/' + saveId,
        {
            method: 'PATCH',
            body: JSON.stringify({ data, hash, baseHash }),
        },
        token
    );
    if (response.status === 401) return undefined;
    return response;
};
