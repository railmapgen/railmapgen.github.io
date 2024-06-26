export interface WorkspaceTab {
    app: string;
    id: string;
    url?: string;
    title?: string;
}

// localStorage key
export enum LocalStorageKey {
    OPENED_TABS = 'rmg-home__openedTabs',
    ACTIVE_TAB = 'rmg-home__activeTab',
    LAST_SHOW_DEVTOOLS = 'lastShowDevtools',
    SHOW_FONT_ADVICE = 'showFontAdvice',
}

export enum Events {
    APP_LOAD = 'APP_LOAD',

    OPEN_APP = 'OPEN_APP',
    CLOSE_APP = 'CLOSE_APP',
    OPEN_LINK = 'OPEN_LINK',
    TOGGLE_NAV_MENU = 'TOGGLE_NAV_MENU',
    CHANGE_LANGUAGE = 'CHANGE_LANGUAGE',
    SHOW_DEVTOOLS = 'SHOW_DEVTOOLS',

    RAISE_ISSUE = 'RAISE_ISSUE',
    JOIN_SLACK = 'JOIN_SLACK',
    DOWNLOAD_FONT = 'DOWNLOAD_FONT',
}

export const FRAME_ID_PREFIX = 'rmg-home:frame-';

export const QUERY_STRINGS = {
    APP: 'app',
    SEARCH_PARAMS: 'searchParams',
    HASH_PARAMS: 'hashParams',
};
