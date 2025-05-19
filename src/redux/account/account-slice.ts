import { logger } from '@railmapgen/rmg-runtime';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import i18n from '../../i18n/config';
import { apiFetch } from '../../util/api';
import {
    API_ENDPOINT,
    APILoginResponse,
    APISaveInfo,
    APISaveList,
    APISubscription,
    SAVE_KEY,
} from '../../util/constants';
import { getRMPSave, notifyRMPSaveChange, setRMPSave } from '../../util/local-storage-save';
import { RootState } from '../index';
import { addNotification } from '../notification/notification-slice';
import { setLastChangedAtTimeStamp, setResolveConflictModal } from '../rmp-save/rmp-save-slice';

type DateTimeString = `${string}T${string}Z`;
export interface ActiveSubscriptions {
    RMP_CLOUD?: DateTimeString;
    RMP_EXPORT?: DateTimeString;
}

export const defaultActiveSubscriptions: ActiveSubscriptions = {
    RMP_CLOUD: undefined,
    RMP_EXPORT: undefined,
};

export interface AccountState {
    isLoggedIn: boolean;
    id?: number;
    name?: string;
    email?: string;
    token?: string;
    expires?: string;
    refreshToken?: string;
    refreshExpires?: string;
    activeSubscriptions: ActiveSubscriptions;
    currentSaveId?: number;
    saves: APISaveInfo[];
}

const initialState: AccountState = {
    isLoggedIn: false,
    id: undefined,
    name: '',
    email: undefined,
    token: undefined,
    expires: undefined,
    refreshToken: undefined,
    refreshExpires: undefined,
    activeSubscriptions: defaultActiveSubscriptions,
    currentSaveId: undefined,
    saves: [],
};

export interface LoginInfo {
    id: number;
    name: string;
    email: string;
    token: string;
    expires: string;
    refreshToken: string;
    refreshExpires: string;
}

export const fetchSaveList = createAsyncThunk<APISaveList, undefined>(
    'account/getSaveList',
    async (_, { getState, dispatch, rejectWithValue }) => {
        const { isLoggedIn, token } = (getState() as RootState).account;
        if (!isLoggedIn || !token) return rejectWithValue('No token.');
        const rep = await apiFetch(API_ENDPOINT.SAVES, {}, token);
        if (rep.status === 401) {
            dispatch(logout());
            return rejectWithValue('Can not recover from expired refresh token.');
        }
        if (rep.status !== 200) {
            return rejectWithValue(rep.text);
        }
        return (await rep.json()) as APISaveList;
    }
);

export const fetchLogin = createAsyncThunk<{ error?: string; username?: string }, { email: string; password: string }>(
    'account/fetchLogin',
    async (accountInfo, { dispatch }) => {
        const { email, password } = accountInfo;
        try {
            const loginRes = await apiFetch(API_ENDPOINT.AUTH_LOGIN, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            if (loginRes.status !== 200) {
                return { error: await loginRes.text(), username: undefined };
            }
            const {
                user: { name: username, id: userId },
                tokens: {
                    access: { token, expires },
                    refresh: { token: refreshToken, expires: refreshExpires },
                },
            } = (await loginRes.json()) as APILoginResponse;
            dispatch(login({ id: userId, name: username, email, token, expires, refreshToken, refreshExpires }));

            dispatch(fetchSubscription());

            // make sure saves are set before syncAfterLogin
            await dispatch(fetchSaveList());

            await dispatch(syncAfterLogin());

            return { error: undefined, username };
        } catch (e) {
            return { error: (e as Error).message, username: undefined };
        }
    }
);

/**
 * Fetch the cloud save and see which one is newer.
 * If the cloud save is newer, update the local save with the cloud save.
 * If the local save is newer, prompt the user to choose between local and cloud.
 */
export const syncAfterLogin = createAsyncThunk<undefined, undefined>(
    'account/syncAfterLogin',
    async (_, { getState, dispatch, rejectWithValue }) => {
        logger.debug('Sync after login - check if local save is newer');
        const state = getState() as RootState;
        const {
            account: { isLoggedIn, token, currentSaveId, saves },
            rmpSave: { lastChangedAtTimeStamp },
        } = state;
        const lastChangedAt = new Date(lastChangedAtTimeStamp);
        const save = saves.filter(save => save.id === currentSaveId).at(0);
        if (!isLoggedIn || !save) {
            // TODO: ask sever to reconstruct currentSaveId
            return rejectWithValue(`Save id: ${currentSaveId} is not in saveList!`);
        }
        const lastUpdateAt = new Date(save.lastUpdateAt);
        const rep = await apiFetch(API_ENDPOINT.SAVES + '/' + currentSaveId, {}, token);
        if (rep.status === 401) {
            dispatch(logout());
            return rejectWithValue('Login status expired.');
        }
        if (rep.status !== 200) {
            return rejectWithValue(await rep.text());
        }
        const cloudData = await rep.text();
        const localData = await getRMPSave(SAVE_KEY.RMP);
        if (lastChangedAt <= lastUpdateAt || !localData) {
            // update newer cloud to local (lastChangedAt <= saves[currentSaveId].lastUpdateAt)
            logger.info(`Set ${SAVE_KEY.RMP} with save id: ${currentSaveId}`);
            setRMPSave(SAVE_KEY.RMP, cloudData);
            dispatch(setLastChangedAtTimeStamp(new Date().valueOf()));
            notifyRMPSaveChange();
        } else {
            // prompt user to choose between local and cloud (lastChangedAt > saves[currentSaveId].lastUpdateAt)
            dispatch(
                setResolveConflictModal({
                    lastChangedAtTimeStamp: lastChangedAt.valueOf(),
                    lastUpdatedAtTimeStamp: lastUpdateAt.valueOf(),
                    cloudData: cloudData,
                })
            );
        }
    }
);

export const fetchSubscription = createAsyncThunk<undefined, undefined>(
    'account/fetchSubscription',
    async (_, { getState, dispatch, rejectWithValue }) => {
        const { isLoggedIn, token } = (getState() as RootState).account;
        if (!isLoggedIn || !token) return rejectWithValue('No token.');
        const rep = await apiFetch(API_ENDPOINT.SUBSCRIPTION, {}, token);
        if (rep.status === 401) {
            dispatch(
                addNotification({
                    title: i18n.t('Unable to retrieve your subscriptions'),
                    message: i18n.t('Login status expired.'),
                    duration: 60,
                    type: 'error',
                })
            );
            dispatch(logout());
            return rejectWithValue('Login status expired.');
        }
        if (rep.status !== 200) {
            dispatch(
                addNotification({
                    title: i18n.t('Unable to retrieve your subscriptions'),
                    message: await rep.text(),
                    duration: 60,
                    type: 'error',
                })
            );
            return rejectWithValue(await rep.text());
        }
        const subscriptions = (await rep.json()).subscriptions as APISubscription[];
        const activeSubscriptions = structuredClone(defaultActiveSubscriptions);
        for (const subscription of subscriptions) {
            const type = subscription.type;
            if (type in activeSubscriptions) {
                activeSubscriptions[type as keyof ActiveSubscriptions] = subscription.expires as DateTimeString;
            }
        }
        dispatch(setActiveSubscriptions(activeSubscriptions));
    }
);

const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<LoginInfo>) => {
            state.isLoggedIn = true;
            state.id = action.payload.id;
            state.name = action.payload.name;
            state.email = action.payload.email;
            state.token = action.payload.token;
            state.expires = action.payload.expires;
            state.refreshToken = action.payload.refreshToken;
            state.refreshExpires = action.payload.refreshExpires;
            state.activeSubscriptions = defaultActiveSubscriptions;
            state.currentSaveId = undefined;
            state.saves = [];
        },

        logout: state => {
            state.isLoggedIn = false;
            state.id = undefined;
            state.name = undefined;
            state.email = undefined;
            state.token = undefined;
            state.expires = undefined;
            state.refreshToken = undefined;
            state.refreshExpires = undefined;
            state.activeSubscriptions = defaultActiveSubscriptions;
            state.currentSaveId = undefined;
            state.saves = [];
        },

        updateName: (state, action: PayloadAction<string>) => {
            state.name = action.payload;
        },

        setToken: (state, action: PayloadAction<{ access: string; refresh: string }>) => {
            state.token = action.payload.access;
            state.refreshToken = action.payload.refresh;
        },

        setExpires: (state, action: PayloadAction<{ expires: string; refreshExpires: string }>) => {
            state.expires = action.payload.expires;
            state.refreshExpires = action.payload.refreshExpires;
        },

        setActiveSubscriptions: (state, action: PayloadAction<ActiveSubscriptions>) => {
            state.activeSubscriptions = action.payload;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(fetchSaveList.fulfilled, (state, action: PayloadAction<APISaveList>) => {
                state.currentSaveId = action.payload.currentSaveId;
                state.saves = action.payload.saves;
            })
            .addCase(fetchSaveList.rejected, (state, action: PayloadAction<unknown>) => {
                console.log(state, action.payload);
                // pass
            });
    },
});

export const { login, logout, updateName, setActiveSubscriptions, setToken, setExpires } = accountSlice.actions;
export default accountSlice.reducer;
