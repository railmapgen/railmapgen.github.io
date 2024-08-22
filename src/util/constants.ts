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
    ACCOUNT = 'rmg-home__account',
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

export enum API_ENDPOINT {
    AUTH_REGISTER = '/auth/register',
    AUTH_LOGIN = '/auth/login',
    AUTH_SEND_VERIFICATION_EMAIL = '/auth/send-verification-email',
    AUTH_SEND_RESET_PASSWORD_EMAIL = '/auth/forgot-password',
    AUTH_RESET_PASSWORD = '/auth/reset-password',
    AUTH_REFRESH = '/auth/refresh-tokens',
    AUTH_LOGOUT = '/auth/logout',
    USER = '/users',
    SUBSCRIPTION = '/subscription',
    SUBSCRIPTION_REDEEM = '/subscription/redeem',
    SAVES = '/saves',
}

export const API_URL = 'https://railmapgen.org/v1';

export interface APILoginResponse {
    user: { id: number; name: string };
    tokens: { access: { token: string; expires: string }; refresh: { token: string; expires: string } };
}

export interface APISaveInfo {
    index: string;
    id: number;
    hash: string;
    lastUpdateAt: Date;
}

export interface APISaveList {
    saves: APISaveInfo[];
    currentSaveId: number;
}

export enum SAVE_KEY {
    RMP = 'rmp__param',
}
