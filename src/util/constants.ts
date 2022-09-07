export enum LanguageCode {
    Azerbaijani = 'az',
    Arabic = 'ar',
    Catalan = 'ca',
    Chinese = 'zh',
    ChineseCN = 'zh-CN',
    ChineseSimp = 'zh-Hans',
    ChineseTrad = 'zh-Hant',
    ChineseHK = 'zh-HK',
    ChineseTW = 'zh-TW',
    English = 'en',
    French = 'fr',
    Gaelic = 'ga',
    German = 'de',
    Hindi = 'hi',
    Japanese = 'ja',
    Korean = 'ko',
    Malay = 'ms',
    Norwegian = 'no',
    Spanish = 'es',
    Persian = 'fa',
    Portuguese = 'pt',
    Russian = 'ru',
    Swedish = 'sv',
    Turkish = 'tr',
}

export type Translation = { [l in LanguageCode]?: string };

export type AppId = 'rmg' | 'rmg-palette' | 'rmg-components' | 'rmg-templates' | 'seed-project' | 'rmg-translate';

export const componentList: Record<AppId, string> = {
    rmg: 'Rail Map Generator',
    'rmg-palette': 'Palette',
    'rmg-components': 'Components',
    'rmg-templates': 'Templates',
    'seed-project': 'Seed Project',
    'rmg-translate': 'Translate',
};

export interface WorkspaceApp {
    id: AppId;
    name: string;
}

// localStorage key
export enum LocalStorageKey {
    OPENED_APPS = 'rmg-home__openedApps',
    ACTIVE_APP = 'rmg-home__activeApp',
}
