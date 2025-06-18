export interface WorkspaceTab {
    app: string;
    id: string;
    url?: string;
    title?: string;
}

// localStorage key
export enum LocalStorageKey {
    OPENED_TABS = 'openedTabs',
    ACTIVE_TAB = 'activeTab',
    LAST_SHOW_DEVTOOLS = 'lastShowDevtools',
    SHOW_FONT_ADVICE = 'showFontAdvice',
    ACCOUNT = 'account',
    RMP_SAVE = 'rmp-save',
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
    FOLLOW_BILIBILI = 'FOLLOW_BILIBILI',
    DOWNLOAD_FONT = 'DOWNLOAD_FONT',
}

export const FRAME_ID_PREFIX = 'rmg-home:frame-';

export const QUERY_STRINGS = {
    APP: 'app',
    SEARCH_PARAMS: 'searchParams',
    SEARCH_PARAMS_SHORT: 's',
    HASH_PARAMS: 'hashParams',
    HASH_PARAMS_SHORT: 'h',
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
    SHARE = '/share',
}

export const API_URL = 'https://railmapgen.org/v1';
// export const API_URL = 'http://localhost:3000/v1';

type Timestamp = `${number}-${number}-${number}T${number}:${number}:${number}Z`;

export interface APILoginResponse {
    user: { id: number; name: string };
    tokens: { access: { token: string; expires: Timestamp }; refresh: { token: string; expires: Timestamp } };
}

export interface APISaveInfo {
    index: string;
    id: number;
    hash: string;
    lastUpdateAt: Timestamp;
    share?: {
        s: string;
        validUntil: Timestamp | null;
    };
}

export interface APISaveList {
    saves: APISaveInfo[];
    currentSaveId: number;
}

export interface APISubscription {
    type: 'RMP' | 'RMP_CLOUD' | 'RMP_EXPORT';
    expires: string;
}

export enum SAVE_KEY {
    RMP = 'rmp__param',
}
