import { logger } from '@railmapgen/rmg-runtime';
import { fetchSaveList, logout } from '../redux/account/account-slice';
import { createStore } from '../redux/index';
import { setLastChangedAtTimeStamp } from '../redux/rmp-save/rmp-save-slice';
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
    const eventHandler = async (ev: MessageEvent<SaveManagerEvent>) => {
        const { type, key, from } = ev.data;
        if (type === SaveManagerEventType.SAVE_CHANGED && from === 'rmp') {
            logger.info(`Received save changed event on key: ${key}`);
            store.dispatch(setLastChangedAtTimeStamp(new Date().valueOf()));
        }

        if (updateSaveTimeout) {
            return;
        }

        updateSaveTimeout = window.setTimeout(async () => {
            updateSaveTimeout = undefined;

            const { isLoggedIn, currentSaveId, token, refreshToken } = store.getState().account;
            if (!isLoggedIn || !currentSaveId || !token || !refreshToken) return;

            const { type, key, from } = ev.data;
            if (type === SaveManagerEventType.SAVE_CHANGED && from === 'rmp') {
                logger.info(`Update save after timeout on key: ${key}`);

                if (!isLoggedIn || !currentSaveId) {
                    logger.warn('Not logged in or no current save id. No save update.');
                    return;
                }

                const { saves: saveList } = store.getState().account;
                const save = saveList.filter(save => save.id === currentSaveId).at(0);
                if (!save) {
                    logger.error(`Save id: ${currentSaveId} is not in saveList!`);
                    // TODO: ask the server to reconstruct currentSaveId
                    return;
                }

                const lastUpdateAt = new Date(save.lastUpdateAt);
                const { lastChangedAtTimeStamp } = store.getState().rmpSave;
                const lastChangedAt = new Date(lastChangedAtTimeStamp);
                if (lastChangedAt < lastUpdateAt) {
                    logger.warn(`Save id: ${currentSaveId} is newer in the cloud via local compare.`);
                    // do nothing until the local catch up with the cloud
                    return;
                }

                logger.info(`Update remote save id: ${currentSaveId} with local key: ${key}`);
                const rep = await updateSave(currentSaveId, token, refreshToken, key!);
                if (!rep) {
                    store.dispatch(logout());
                    return;
                }
                if (rep.status === 409) {
                    logger.warn(`Save id: ${currentSaveId} is newer in the cloud via server response.`);
                    // do nothing until the local catch up with the cloud
                    return;
                }
                if (rep.status !== 200) return;
                store.dispatch(fetchSaveList());
            }
        }, SAVE_UPDATE_TIMEOUT_MS);
    };

    channel.addEventListener('message', eventHandler);
};

export const updateSave = async (currentSaveId: number, token: string, refreshToken: string, key: SAVE_KEY) => {
    const save = await getRMPSave(key);
    if (!save) return undefined;
    const { data, hash } = save;
    const response = await apiFetch(
        API_ENDPOINT.SAVES + '/' + currentSaveId,
        {
            method: 'PATCH',
            body: JSON.stringify({ data, hash }),
        },
        token
    );
    if (response.status === 401) return undefined;
    return response;
};
