import { RmgEnv, RmgInstance } from '@railmapgen/rmg-runtime';

export type AppId =
    | 'rmg'
    | 'rmp'
    | 'rmg-palette'
    | 'rmg-palette-upload'
    | 'rmg-components'
    | 'rmg-templates'
    | 'rmg-templates-upload'
    | 'rmp-gallery'
    | 'seed-project'
    | 'rmg-translate';

interface AppDetail {
    name: string;
    url: string;
    allowedEnvs: RmgEnv[];
    allowMultiInstances?: boolean;
    showContributors?: boolean;
    legacyContributors?: string;
    showDonators?: boolean;
}

export const appEnablement: Record<AppId, AppDetail> = {
    rmg: {
        name: 'Rail Map Generator',
        url: '/rmg/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
        allowMultiInstances: true,
    },
    rmp: {
        name: 'Rail Map Painter',
        url: '/rmp/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
    },
    'rmg-palette': {
        name: 'Palette',
        url: '/rmg-palette/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
        showContributors: true,
        legacyContributors: 'legacy-contributor-list.txt',
    },
    'rmg-palette-upload': {
        name: 'Palette - Upload',
        url: '/rmg-palette/#/new',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
    },
    'rmg-components': {
        name: 'Components',
        url: '/rmg-components/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT],
    },
    'rmg-templates': {
        name: 'RMG Templates',
        url: '/rmg-templates/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
        showContributors: true,
        legacyContributors: 'legacy-contributor-list.txt',
    },
    'rmg-templates-upload': {
        name: 'RMG Templates - Upload',
        url: '/rmg-templates/#/new',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
    },
    'rmp-gallery': {
        name: 'RMP Gallery',
        url: '/rmp-gallery/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
        showContributors: true,
        showDonators: true,
    },
    'seed-project': {
        name: 'Seed Project',
        url: '/seed-project/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT],
    },
    'rmg-translate': {
        name: 'Translate',
        url: '/rmg-translate/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT],
    },
};

export const getAvailableApps = (env: RmgEnv): AppId[] => {
    return Object.entries(appEnablement)
        .filter(([_, component]) => component.allowedEnvs.includes(env))
        .map(([appId]) => appId as AppId);
};

export interface WorkspaceTab {
    app: AppId;
    id: string;
    url?: string;
}

// localStorage key
export enum LocalStorageKey {
    OPENED_TABS = 'rmg-home__openedTabs',
    ACTIVE_TAB = 'rmg-home__activeTab',
}

export const mirrorName: Record<RmgInstance, string> = {
    GitHub: 'GitHub Pages',
    GitLab: 'GitLab Pages',
    Gitee: 'Gitee Pages',
    Tauri: 'Tauri Offline',
    localhost: 'localhost',
    unknown: 'unknown',
};

export const getMirrorUrl = (instance: RmgInstance, env: RmgEnv) => {
    return `https://${env === RmgEnv.PRD ? '' : 'uat-'}railmapgen.${instance === 'GitLab' ? 'gitlab' : 'github'}.io`;
};

export enum Events {
    APP_LOAD = 'APP_LOAD',

    OPEN_APP = 'OPEN_APP',
    CLOSE_APP = 'CLOSE_APP',
    TOGGLE_NAV_MENU = 'TOGGLE_NAV_MENU',
    CHANGE_LANGUAGE = 'CHANGE_LANGUAGE',

    SWITCH_MIRROR = 'SWITCH_MIRROR',
    DOWNLOAD_APP = 'DOWNLOAD_APP',
}

export const FRAME_ID_PREFIX = 'rmg-home:frame-';
