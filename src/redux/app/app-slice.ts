import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppId, componentList, WorkspaceApp } from '../../util/constants';

interface AppState {
    openedApps: WorkspaceApp[];
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
        openApp: (state, action: PayloadAction<AppId>) => {
            const id = action.payload;
            if (state.openedApps.some(app => app.id === id)) {
                state.activeApp = id;
            } else {
                state.openedApps.push({
                    id,
                    name: componentList[id],
                });
                state.activeApp = id;
            }
        },
    },
});

export const { openApp } = appSlice.actions;
export default appSlice.reducer;
