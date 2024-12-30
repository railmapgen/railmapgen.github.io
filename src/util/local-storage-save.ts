import { logger } from '@railmapgen/rmg-runtime';
import { fetchSaveList, logout, setToken, syncAfterLogin } from '../redux/account/account-slice';
import { createStore } from '../redux/index';
import { setLastChangedAt } from '../redux/save/save-slice';
import { API_ENDPOINT, SAVE_KEY } from './constants';
import { apiFetch, createHash } from './utils';

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
    TOKEN_REQUEST = 'TOKEN_REQUEST',
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
            store.dispatch(setLastChangedAt());
        }

        if (updateSaveTimeout) {
            return;
        }

        updateSaveTimeout = window.setTimeout(async () => {
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
                    // TODO: ask sever to reconstruct currentSaveId
                    return;
                }

                const { lastChangedAt } = store.getState().save;
                if (lastChangedAt < save.lastUpdateAt) {
                    logger.warn(`Save id: ${currentSaveId} is newer in the cloud via local compare.`);
                    store.dispatch(syncAfterLogin());
                    return;
                }

                logger.info(`Update remote save id: ${currentSaveId} with local key: ${key}`);
                const {
                    rep,
                    token: updatedToken,
                    refreshToken: updatedRefreshToken,
                } = await updateSave(currentSaveId, token, refreshToken, key!);
                if (!updatedRefreshToken || !updatedToken) {
                    store.dispatch(logout());
                    return;
                }
                store.dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
                if (rep.status === 409) {
                    logger.warn(`Save id: ${currentSaveId} is newer in the cloud via server response.`);
                    store.dispatch(syncAfterLogin());
                    return;
                }
                if (rep.status !== 200) return;
                store.dispatch(fetchSaveList());
            }

            updateSaveTimeout = undefined;
        }, SAVE_UPDATE_TIMEOUT_MS);
    };

    channel.addEventListener('message', eventHandler);
};

export const updateSave = async (currentSaveId: number, token: string, refreshToken: string, key: SAVE_KEY) => {
    const save = await getRMPSave(key);
    if (!save) return { rep: undefined, token: undefined, refreshToken: undefined };
    const { data, hash } = save;
    return await apiFetch(
        API_ENDPOINT.SAVES + '/' + currentSaveId,
        {
            method: 'PATCH',
            body: JSON.stringify({ data, hash }),
        },
        token,
        refreshToken
    );
};

// This should trigger RMP to refetch subscription info.
export const notifyRMPTokenUpdate = (token?: string) => {
    channel.postMessage({
        type: SaveManagerEventType.TOKEN_REQUEST,
        token: token,
        from: 'rmt',
    } as SaveManagerEvent);
};

export const registerOnTokenRequest = (store: ReturnType<typeof createStore>) => {
    const eventHandler = async (ev: MessageEvent<SaveManagerEvent>) => {
        const { type, from } = ev.data;
        if (type === SaveManagerEventType.TOKEN_REQUEST && from === 'rmp') {
            logger.info(`Received token request event from: ${from}`);

            const { isLoggedIn, token, refreshToken } = store.getState().account;
            if (!isLoggedIn || !token || !refreshToken) {
                notifyRMPTokenUpdate();
                return;
            }

            store.dispatch(fetchSaveList());

            const {
                isLoggedIn: isLoggedInAfterFetch,
                token: tokenAfterFetch,
                refreshToken: refreshTokenAfterFetch,
            } = store.getState().account;
            if (!isLoggedInAfterFetch || !tokenAfterFetch || !refreshTokenAfterFetch) {
                notifyRMPTokenUpdate();
                return;
            }

            notifyRMPTokenUpdate(tokenAfterFetch);
        }
    };

    channel.addEventListener('message', eventHandler);
};
