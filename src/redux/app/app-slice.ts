import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppId, WorkspaceTab } from '../../util/constants';

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

        updateTabUrl: (state, action: PayloadAction<{ id: string; url: string }>) => {
            const { id, url } = action.payload;
            state.openedTabs = state.openedTabs.map(tab => (tab.id === id ? { ...tab, url } : tab));
        },

        setActiveTab: (state, action: PayloadAction<string | undefined>) => {
            state.activeTab = action.payload;
        },

        openApp: (state, action: PayloadAction<AppId>) => {
            const appId = action.payload;

            const activeApp = state.openedTabs.find(({ id }) => id === state.activeTab);
            const openedApp = state.openedTabs.find(({ app }) => app === appId);

            if (activeApp?.app === appId) {
                // do nothing as app is opened
                // this condition is required for multi-instance app
            } else if (openedApp) {
                // make app active
                state.activeTab = openedApp.id;
            } else {
                // open app in new tab
                const tabId = crypto.randomUUID();
                state.openedTabs.push({ id: tabId, app: appId });
                state.activeTab = tabId;
            }
        },

        openAppInNew: (state, action: PayloadAction<AppId>) => {
            const tabId = crypto.randomUUID();
            state.openedTabs.push({ id: tabId, app: action.payload });
            state.activeTab = tabId;
        },

        closeTab: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            const nextOpenedApps = state.openedTabs.filter(tab => tab.id !== id);

            if (nextOpenedApps.length === 0) {
                state.openedTabs = [];
                state.activeTab = undefined;
                state.isShowMenu = true;
            } else if (state.activeTab === id) {
                const prevIndex = state.openedTabs.findIndex(tab => tab.id === id);
                state.openedTabs = nextOpenedApps;
                state.activeTab = nextOpenedApps[Math.min(prevIndex, nextOpenedApps.length - 1)].id;
            } else {
                state.openedTabs = nextOpenedApps;
            }
        },
    },
});

export const { toggleMenu, setOpenedTabs, updateTabUrl, setActiveTab, openApp, openAppInNew, closeTab } =
    appSlice.actions;
export default appSlice.reducer;
