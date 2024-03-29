import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WorkspaceTab } from '../../util/constants';
import { assetEnablement } from '../../util/asset-enablements';

type MenuView = 'main' | 'settings' | 'support';
type FontConfig = {
    displayName?: string;
    url?: string;
};

export const NEVER = 'never';

export interface AppState {
    isPrimary?: boolean;
    isTerminated?: boolean;
    isShowMenu: boolean;
    menuView: MenuView;
    refreshRequired: boolean;
    lastShowDevtools: number;
    openedTabs: WorkspaceTab[];
    activeTab?: string;
    remoteFonts: Record<string, FontConfig>;
    showFontAdvice: typeof NEVER | 'hide' | 'show';
}

const initialState: AppState = {
    isShowMenu: true,
    menuView: 'main',
    refreshRequired: false,
    lastShowDevtools: 0,
    openedTabs: [],
    activeTab: undefined,
    remoteFonts: {},
    showFontAdvice: 'hide',
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setIsPrimary: (state, action: PayloadAction<boolean>) => {
            state.isPrimary = action.payload;
        },

        terminateSession: state => {
            state.isTerminated = true;
        },

        toggleMenu: state => {
            state.isShowMenu = !state.isShowMenu;
        },

        setMenuView: (state, action: PayloadAction<MenuView>) => {
            state.menuView = action.payload;
        },

        requireRefresh: state => {
            state.refreshRequired = true;
        },

        showDevtools: (state, action: PayloadAction<number | undefined>) => {
            const now = Date.now();
            if (!action.payload) {
                state.lastShowDevtools = now;
            } else if (action.payload < now) {
                state.lastShowDevtools = action.payload;
            }
        },

        hideDevtools: state => {
            state.lastShowDevtools = 0;
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

        openApp: (state, action: PayloadAction<{ appId: string; url?: string }>) => {
            const { appId, url } = action.payload;

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
                state.openedTabs.push({ id: tabId, app: appId, url: url ?? assetEnablement[appId].url });
                state.activeTab = tabId;
            }
        },

        openAppInNew: (state, action: PayloadAction<string>) => {
            const tabId = crypto.randomUUID();
            state.openedTabs.push({ id: tabId, app: action.payload });
            state.activeTab = tabId;
        },

        closeTab: (state, action: PayloadAction<string>) => {
            const id = action.payload;

            const sortedTabs = state.openedTabs.slice().sort((a, b) => {
                const keySet = Object.keys(assetEnablement);
                return keySet.indexOf(a.app) - keySet.indexOf(b.app);
            });
            state.openedTabs = state.openedTabs.filter(tab => tab.id !== id);

            if (state.activeTab === id) {
                const prevIndex = sortedTabs.findIndex(tab => tab.id === id);
                state.activeTab = sortedTabs.filter(tab => tab.id !== id)[Math.max(0, prevIndex - 1)]?.id;
            }
        },

        closeApp: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            if (!state.openedTabs.some(tab => tab.app === id)) {
                // input app is not opened
                return;
            }

            const openedApps = Object.keys(assetEnablement).filter(appId =>
                state.openedTabs.some(tab => tab.app === appId)
            );
            const activeApp = state.openedTabs.find(tab => tab.id === state.activeTab)?.app;
            const nextOpenedTabs = state.openedTabs.filter(tab => tab.app !== id);
            state.openedTabs = nextOpenedTabs;

            if (activeApp === id) {
                const prevIndex = openedApps.findIndex(app => app === id);
                state.activeTab = nextOpenedTabs.find(tab => tab.app === openedApps[Math.max(0, prevIndex - 1)])?.id;
            }
        },

        addRemoteFont: (state, action: PayloadAction<{ family: string; config: FontConfig }>) => {
            const { family, config } = action.payload;
            if (!(family in state.remoteFonts)) {
                state.remoteFonts[family] = config;
                if (state.showFontAdvice === 'hide') {
                    state.showFontAdvice = 'show';
                }
            }
        },

        hideFontAdvice: state => {
            state.showFontAdvice = 'hide';
        },

        neverShowFontAdvice: state => {
            state.showFontAdvice = 'never';
        },
    },
});

export const isShowDevtools = (lastShowDevtools: number) => {
    const now = Date.now();
    return lastShowDevtools + 86_400_000 >= now;
};

export const {
    setIsPrimary,
    terminateSession,
    toggleMenu,
    setMenuView,
    requireRefresh,
    showDevtools,
    hideDevtools,
    setOpenedTabs,
    updateTabUrl,
    setActiveTab,
    openApp,
    openAppInNew,
    closeTab,
    closeApp,
    addRemoteFont,
    hideFontAdvice,
    neverShowFontAdvice,
} = appSlice.actions;
export default appSlice.reducer;
