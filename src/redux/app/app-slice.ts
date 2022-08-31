import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppId } from '../../util/constants';

export interface AppState {
    openedApps: AppId[];
    activeApp?: AppId;
}

const initialState: AppState = {
    openedApps: [],
    activeApp: undefined,
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setOpenedApps: (state, action: PayloadAction<AppId[]>) => {
            state.openedApps = action.payload;
        },

        setActiveApp: (state, action: PayloadAction<AppId | undefined>) => {
            state.activeApp = action.payload;
        },

        openApp: (state, action: PayloadAction<AppId>) => {
            const id = action.payload;
            if (!state.openedApps.includes(id)) {
                state.openedApps.push(id);
            }

            // make app active
            state.activeApp = id;
        },

        closeApp: (state, action: PayloadAction<AppId>) => {
            const id = action.payload;
            const nextOpenedApps = state.openedApps.filter(appId => appId !== id);

            if (state.activeApp === id) {
                const prevIndex = state.openedApps.indexOf(id);
                state.openedApps = nextOpenedApps;
                state.activeApp = nextOpenedApps[Math.min(prevIndex, nextOpenedApps.length - 1)];
            } else {
                state.openedApps = nextOpenedApps;
            }
        },
    },
});

export const { setOpenedApps, setActiveApp, openApp, closeApp } = appSlice.actions;
export default appSlice.reducer;
