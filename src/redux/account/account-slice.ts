import { logger } from '@railmapgen/rmg-runtime';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import i18n from '../../i18n/config';
import { RootState } from '../../redux/index';
import { API_ENDPOINT, API_URL, APILoginResponse, APISaveInfo, APISaveList, SAVE_KEY } from '../../util/constants';
import { getRMPSave, notifyRMPSaveChange, notifyRMPTokenUpdate, setRMPSave } from '../../util/local-storage-save';
import { apiFetch } from '../../util/utils';
import { setLastChangedAtTimeStamp, setResolveConflictModal } from '../save/save-slice';

export interface ActiveSubscriptions {
    RMP_CLOUD: boolean;
    RMP_EXPORT: boolean;
}

export const defaultActiveSubscriptions: ActiveSubscriptions = {
    RMP_CLOUD: false,
    RMP_EXPORT: false,
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
        const { isLoggedIn, token, refreshToken } = (getState() as RootState).account;
        if (!isLoggedIn || !token) return rejectWithValue('No token.');
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SAVES, {}, token, refreshToken);
        if (!updatedToken || !updatedRefreshToken) {
            dispatch(logout());
            return rejectWithValue('Can not recover from expired refresh token.');
        }
        dispatch(setToken({ access: updatedToken!, refresh: updatedRefreshToken! }));
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
        const loginRes = await fetch(API_URL + API_ENDPOINT.AUTH_LOGIN, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
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
        await dispatch(fetchSaveList()); // make sure saves are set before syncAfterLogin
        notifyRMPTokenUpdate(token);

        await dispatch(syncAfterLogin());

        return { error: undefined, username };
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
            account: { isLoggedIn, token, refreshToken, currentSaveId, saves },
            save: { lastChangedAtTimeStamp },
        } = state;
        const lastChangedAt = new Date(lastChangedAtTimeStamp);
        const save = saves.filter(save => save.id === currentSaveId).at(0);
        if (!isLoggedIn || !save) {
            // TODO: ask sever to reconstruct currentSaveId
            return rejectWithValue(`Save id: ${currentSaveId} is not in saveList!`);
        }
        const lastUpdateAt = new Date(save.lastUpdateAt);
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SAVES + '/' + currentSaveId, {}, token, refreshToken);
        if (!updatedRefreshToken || !updatedToken) {
            dispatch(logout());
            return rejectWithValue(i18n.t('Login status expired.'));
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
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
