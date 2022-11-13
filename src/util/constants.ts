import { RmgEnv, RmgInstance } from '@railmapgen/rmg-runtime';

export type AppId =
    | 'rmg'
    | 'rmp'
    | 'rmg-palette'
    | 'rmg-components'
    | 'rmg-templates'
    | 'seed-project'
    | 'rmg-translate';

interface AppDetail {
    name: string;
    allowedEnvs: RmgEnv[];
    allowMultiInstances?: boolean;
}

export const appEnablement: Record<AppId, AppDetail> = {
    rmg: {
        name: 'Rail Map Generator',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
        allowMultiInstances: true,
    },
    rmp: {
        name: 'Rail Map Painter',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
    },
    'rmg-palette': {
        name: 'Palette',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
    },
    'rmg-components': {
        name: 'Components',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT],
    },
    'rmg-templates': {
        name: 'Templates',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
    },
    'seed-project': {
        name: 'Seed Project',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT],
    },
    'rmg-translate': {
        name: 'Translate',
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
}

// localStorage key
export enum LocalStorageKey {
    OPENED_TABS = 'rmg-home__openedTabs',
    ACTIVE_TAB = 'rmg-home__activeTab',
}

export const mirrorName: Record<RmgInstance, string> = {
    GitHub: 'GitHub Pages',
    GitLab: 'GitLab Pages',
    Bitbucket: 'Bitbucket Cloud',
    localhost: 'localhost',
    unknown: 'unknown',
};

export const getMirrorUrl = (instance: RmgInstance, env: RmgEnv) => {
    return `https://${env === RmgEnv.PRD ? '' : 'uat-'}railmapgen.${
        instance === RmgInstance.GITLAB ? 'gitlab' : 'github'
    }.io`;
};

export enum Events {
    APP_LOAD = 'APP_LOAD',

    OPEN_APP = 'OPEN_APP',
    CLOSE_APP = 'CLOSE_APP',
    TOGGLE_NAV_MENU = 'TOGGLE_NAV_MENU',
    CHANGE_LANGUAGE = 'CHANGE_LANGUAGE',

    SWITCH_MIRROR = 'SWITCH_MIRROR',
}
