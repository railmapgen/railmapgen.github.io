import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../redux/index';
import { API_ENDPOINT, API_URL, APILoginResponse, APISaveInfo, APISaveList } from '../../util/constants';
import { apiFetch } from '../../util/utils';

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
    name?: string;
    email?: string;
    token?: string;
    refreshToken?: string;
    activeSubscriptions: ActiveSubscriptions;
    currentSaveId?: number;
    saves: APISaveInfo[];
}

const initialState: AccountState = {
    isLoggedIn: false,
    name: '',
    email: undefined,
    token: undefined,
    refreshToken: undefined,
    activeSubscriptions: defaultActiveSubscriptions,
    currentSaveId: undefined,
    saves: [],
};

interface LoginInfo {
    name: string;
    email: string;
    token: string;
    refreshToken: string;
}

export const fetchSaveList = createAsyncThunk<APISaveList, undefined>(
    'account/getSaveList',
    async (_, { getState, dispatch, rejectWithValue }) => {
        const { token, refreshToken } = (getState() as RootState).account;
        if (!token) rejectWithValue('No token.');
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SAVES, {}, token, refreshToken);
        if (!updatedToken || !updatedRefreshToken) {
            dispatch(logout());
            rejectWithValue('Can not recover from expired refresh token.');
        }
        dispatch(setToken({ access: updatedToken!, refresh: updatedRefreshToken! }));
        if (rep.status !== 200) {
            rejectWithValue(rep.text);
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
            user: { name: username },
            tokens: {
                access: { token },
                refresh: { token: refreshToken },
            },
        } = (await loginRes.json()) as APILoginResponse;
        dispatch(login({ name: username, email, token, refreshToken }));
        return { error: undefined, username };
    }
);

const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<LoginInfo>) => {
            state.isLoggedIn = true;
            state.name = action.payload.name;
            state.email = action.payload.email;
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
            state.activeSubscriptions = defaultActiveSubscriptions;
            state.currentSaveId = undefined;
            state.saves = [];
        },

        logout: state => {
            state.isLoggedIn = false;
            state.name = undefined;
            state.email = undefined;
            state.token = undefined;
            state.refreshToken = undefined;
            state.activeSubscriptions = defaultActiveSubscriptions;
            state.currentSaveId = undefined;
            state.saves = [];
        },

        setToken: (state, action: PayloadAction<{ access: string; refresh: string }>) => {
            state.token = action.payload.access;
            state.refreshToken = action.payload.refresh;
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

export const { login, logout, setActiveSubscriptions, setToken } = accountSlice.actions;
export default accountSlice.reducer;
