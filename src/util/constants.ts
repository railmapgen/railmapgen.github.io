import { RmgEnv } from '@railmapgen/rmg-runtime';

export type AppId = 'rmg' | 'rmg-palette' | 'rmg-components' | 'rmg-templates' | 'seed-project' | 'rmg-translate';

interface AppDetail {
    name: string;
    allowedEnvs: RmgEnv[];
}

const appEnablement: Record<AppId, AppDetail> = {
    rmg: {
        name: 'Rail Map Generator',
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
        allowedEnvs: [RmgEnv.DEV],
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

export const getAppList = (env: RmgEnv): Partial<Record<AppId, string>> => {
    return Object.entries(appEnablement)
        .filter(([_, component]) => component.allowedEnvs.includes(env))
        .reduce<Partial<Record<AppId, string>>>((acc, [appId, component]) => {
            return { ...acc, [appId as AppId]: component.name };
        }, {});
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
