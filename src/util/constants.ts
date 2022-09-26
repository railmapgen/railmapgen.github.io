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
}

export const appEnablement: Record<AppId, AppDetail> = {
    rmg: {
        name: 'Rail Map Generator',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT, RmgEnv.PRD],
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

export interface WorkspaceApp {
    id: AppId;
    name: string;
}

// localStorage key
export enum LocalStorageKey {
    OPENED_APPS = 'rmg-home__openedApps',
    ACTIVE_APP = 'rmg-home__activeApp',
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
