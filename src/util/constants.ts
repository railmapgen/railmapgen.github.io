import { RmgEnv, RmgInstance } from '@railmapgen/rmg-runtime';

type AssetType = 'app' | 'link';

interface AssetDetail {
    name: string;
    url: string;
    allowedEnvs?: RmgEnv[];
    allowedInstances?: RmgInstance[];
    allowMultiInstances?: boolean;
    showContributors?: boolean;
    legacyContributors?: string;
    showDonators?: boolean;
}

export const appEnablement: Record<string, AssetDetail> = {
    rmg: {
        name: 'Rail Map Generator',
        url: '/rmg/',
        allowMultiInstances: true,
    },
    rmp: {
        name: 'Rail Map Painter',
        url: '/rmp/',
    },
    'rmg-palette': {
        name: 'Palette',
        url: '/rmg-palette/',
        showContributors: true,
        legacyContributors: 'legacy-contributor-list.txt',
    },
    'rmg-palette-upload': {
        name: 'Palette - Upload',
        url: '/rmg-palette/#/new',
    },
    'rmg-components': {
        name: 'Components',
        url: '/rmg-components/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT],
    },
    'rmg-templates': {
        name: 'RMG Templates',
        url: '/rmg-templates/',
        showContributors: true,
        legacyContributors: 'legacy-contributor-list.txt',
    },
    'rmg-templates-upload': {
        name: 'RMG Templates - Upload',
        url: '/rmg-templates/#/new',
    },
    'rmp-gallery': {
        name: 'RMP Gallery',
        url: '/rmp-gallery/',
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
    'runtime-demo': {
        name: 'Runtime Demo',
        url: '/runtime-demo/',
        allowedEnvs: [RmgEnv.DEV, RmgEnv.UAT],
    },
};

const getTauriUrl = () => {
    const baseUrl = 'https://mirror.ghproxy.com/https://github.com/railmapgen/railmapgen.github.io/releases/download';
    const d = new Date();
    const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`;
    const ver = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.1`;
    const platform = navigator.platform;
    const suffix = platform.includes('Linux') ? 'amd64.deb' : platform.includes('Mac') ? 'x64.dmg' : 'x64-setup.exe';
    return baseUrl + `/tauri-${tag}/railmapgen_${ver}_${suffix}`;
};

export const linkEnablement: Record<string, AssetDetail> = {
    tutorial: {
        name: 'Tutorial',
        url: 'https://rmttutorial.wordpress.com',
    },
    'github-pages': {
        name: 'GitHub Pages mirror',
        url: 'https://railmapgen.github.io',
        allowedInstances: ['GitLab', 'Gitee', 'localhost', 'unknown'],
    },
    'gitlab-pages': {
        name: 'GitLab Pages mirror',
        url: 'https://railmapgen.gitlab.io',
        allowedInstances: ['GitHub', 'Gitee', 'localhost', 'unknown'],
    },
    'gitee-pages': {
        name: 'Gitee Pages mirror',
        url: 'https://railmapgen.gitee.io',
        allowedInstances: ['localhost'],
    },
    tauri: {
        name: 'Download desktop app',
        url: getTauriUrl(),
        allowedInstances: ['GitHub', 'GitLab', 'Gitee', 'localhost', 'unknown'],
    },
};

const assetEnablement: Record<AssetType, Record<string, AssetDetail>> = {
    app: appEnablement,
    link: linkEnablement,
};

export const getAvailableAsset = (assetType: AssetType, env: RmgEnv, instance: RmgInstance): string[] => {
    return Object.entries(assetEnablement[assetType])
        .filter(([_, component]) => {
            const envOk = !component.allowedEnvs || component.allowedEnvs.includes(env);
            const instanceOk = !component.allowedInstances || component.allowedInstances.includes(instance);
            return envOk && instanceOk;
        })
        .map(([assetId]) => assetId);
};

export interface WorkspaceTab {
    app: string;
    id: string;
    url?: string;
}

// localStorage key
export enum LocalStorageKey {
    OPENED_TABS = 'rmg-home__openedTabs',
    ACTIVE_TAB = 'rmg-home__activeTab',
}

export enum Events {
    APP_LOAD = 'APP_LOAD',

    OPEN_APP = 'OPEN_APP',
    CLOSE_APP = 'CLOSE_APP',
    OPEN_LINK = 'OPEN_LINK',
    TOGGLE_NAV_MENU = 'TOGGLE_NAV_MENU',
    CHANGE_LANGUAGE = 'CHANGE_LANGUAGE',

    SWITCH_MIRROR = 'SWITCH_MIRROR',
    DOWNLOAD_APP = 'DOWNLOAD_APP',
}

export const FRAME_ID_PREFIX = 'rmg-home:frame-';
