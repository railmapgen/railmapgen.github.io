import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { assetEnablement, tempAssets } from '../../util/asset-enablements';
import { WorkspaceTab } from '../../util/constants';
import { constructUrl } from '../../util/utils';

export type MenuView = 'apps' | 'links' | 'devtools' | 'settings' | 'support' | 'account' | 'contributors';
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
    menuView: 'apps',
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

        setActiveTab: (state, action: PayloadAction<string | undefined>) => {
            state.activeTab = action.payload;
        },

        openApp: (state, action: PayloadAction<{ appId: string; search?: string; hash?: string }>) => {
            const { appId, search, hash } = action.payload;

            const activeApp = state.openedTabs.find(({ id }) => id === state.activeTab);
            const openedApp = state.openedTabs.find(({ app }) => app === appId);
            const isAllowedMultiInstances = assetEnablement[appId].allowMultiInstances ?? false;

            if (search !== undefined || hash !== undefined) {
                if (isAllowedMultiInstances || !openedApp) {
                    // open new tab with search/hash for multi-instance app or not opened app
                    const tabId = crypto.randomUUID();
                    state.openedTabs.push({
                        id: tabId,
                        app: appId,
                        url: constructUrl(assetEnablement[appId].url, search, hash),
                    });
                    state.activeTab = tabId;
                } else {
                    // update url if opened
                    state.openedTabs = state.openedTabs.map(tab => {
                        if (tab.id === openedApp.id) {
                            return { ...tab, url: constructUrl(tab.url ?? assetEnablement[tab.app].url, search, hash) };
                        } else {
                            return tab;
                        }
                    });
                    state.activeTab = openedApp.id;
                }
            } else {
                if (!openedApp) {
                    // open app in new tab
                    const tabId = crypto.randomUUID();
                    state.openedTabs.push({ id: tabId, app: appId, url: constructUrl(assetEnablement[appId].url) });
                    state.activeTab = tabId;
                } else if (activeApp?.app !== appId) {
                    // make app active
                    state.activeTab = openedApp.id;
                }
            }
        },

        openAppInNew: (state, action: PayloadAction<string>) => {
            const tabId = crypto.randomUUID();
            state.openedTabs.push({ id: tabId, app: action.payload });
            state.activeTab = tabId;
        },

        openTempApp: (state, action: PayloadAction<string>) => {
            const tempAppId = action.payload;
            const hasTempAppOpened = state.openedTabs.some(tab => tab.id === tempAppId);
            if (!hasTempAppOpened) {
                state.openedTabs.push({ id: tempAppId, app: tempAppId, url: tempAssets[tempAppId] });
            }
            state.activeTab = tempAppId;
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

        updateTabMetadata: (
            state,
            action: PayloadAction<{ id: string; title?: string; search?: string; hash?: string }>
        ) => {
            const { id, title, search, hash } = action.payload;
            state.openedTabs = state.openedTabs.map(tab =>
                tab.id === id
                    ? {
                          ...tab,
                          title: title ?? tab.title,
                          url: constructUrl(tab.url ?? assetEnablement[tab.app].url, search, hash),
                      }
                    : tab
            );
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
    setActiveTab,
    openApp,
    openAppInNew,
    openTempApp,
    closeTab,
    closeApp,
    updateTabMetadata,
    addRemoteFont,
    hideFontAdvice,
    neverShowFontAdvice,
} = appSlice.actions;
export default appSlice.reducer;
