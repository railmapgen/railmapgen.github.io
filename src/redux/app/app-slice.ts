import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppId, WorkspaceTab } from '../../util/constants';
import { nanoid } from 'nanoid';

export interface AppState {
    isShowMenu: boolean;
    openedTabs: WorkspaceTab[];
    activeTab?: string;
}

const initialState: AppState = {
    isShowMenu: true,
    openedTabs: [],
    activeTab: undefined,
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        toggleMenu: state => {
            state.isShowMenu = !state.isShowMenu;
        },

        setOpenedTabs: (state, action: PayloadAction<WorkspaceTab[]>) => {
            state.openedTabs = action.payload;
        },

        setActiveTab: (state, action: PayloadAction<string | undefined>) => {
            state.activeTab = action.payload;
        },

        openApp: (state, action: PayloadAction<AppId>) => {
            const appId = action.payload;
            const openedApp = state.openedTabs.find(({ app }) => app === appId);

            if (!openedApp) {
                const tabId = nanoid();
                state.openedTabs.push({ id: tabId, app: appId });
                state.activeTab = tabId;
            } else {
                // make app active
                state.activeTab = openedApp.id;
            }
        },

        closeTab: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            const nextOpenedApps = state.openedTabs.filter(tab => tab.id !== id);

            if (state.activeTab === id) {
                const prevIndex = state.openedTabs.findIndex(tab => tab.id === id);
                state.openedTabs = nextOpenedApps;
                state.activeTab = nextOpenedApps[Math.min(prevIndex, nextOpenedApps.length - 1)].id;
            } else {
                state.openedTabs = nextOpenedApps;
            }
        },
    },
});

export const { toggleMenu, setOpenedTabs, setActiveTab, openApp, closeTab } = appSlice.actions;
export default appSlice.reducer;
