export type AppId = 'rmg' | 'rmg-palette' | 'rmg-components' | 'rmg-templates' | 'seed-project';

export const componentList: Record<AppId, string> = {
    rmg: 'Rail Map Generator',
    'rmg-palette': 'Palette',
    'rmg-components': 'Components',
    'rmg-templates': 'Templates',
    'seed-project': 'Seed Project',
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
