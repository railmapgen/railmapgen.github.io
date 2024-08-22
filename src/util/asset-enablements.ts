import { RmgEnv, RmgInstance } from '@railmapgen/rmg-runtime';

export type AssetType = 'app' | 'devtool' | 'link';

export const getAllowedAssetTypes = (isShowDevtools: boolean): AssetType[] => {
    return isShowDevtools ? ['app', 'devtool'] : ['app'];
};

interface AssetDetail {
    name: string;
    url: string;
    assetType: AssetType;
    allowedEnvs?: RmgEnv[];
    allowedInstances?: RmgInstance[];
    allowMultiInstances?: boolean;
    showContributors?: boolean;
    legacyContributors?: string;
    showDonators?: boolean;
}

const getTauriUrl = () => {
    const baseUrl = 'https://mirror.ghproxy.com/https://github.com/railmapgen/railmapgen.github.io/releases/download';
    const d = new Date();
    const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`;
    const ver = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.1`;
    const platform = navigator.platform;
    const suffix = platform.includes('Linux') ? 'amd64.deb' : platform.includes('Mac') ? 'x64.dmg' : 'x64-setup.exe';
    return baseUrl + `/tauri-${tag}/railmapgen_${ver}_${suffix}`;
};

export const assetEnablement: Record<string, AssetDetail> = {
    rmg: {
        name: 'Rail Map Generator',
        url: '/rmg/',
        assetType: 'app',
        allowMultiInstances: true,
    },
    rmp: {
        name: 'Rail Map Painter',
        url: '/rmp/',
        assetType: 'app',
    },
    'rmg-palette': {
        name: 'Palette',
        url: '/rmg-palette/',
        assetType: 'app',
        showContributors: true,
        legacyContributors: 'legacy-contributor-list.txt',
    },
    'rmg-palette-upload': {
        name: 'Palette - Upload',
        url: '/rmg-palette/#/new',
        assetType: 'app',
    },
    'rmg-templates': {
        name: 'RMG Templates',
        url: '/rmg-templates/',
        assetType: 'app',
        showContributors: true,
        legacyContributors: 'legacy-contributor-list.txt',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'Tauri', 'localhost', 'unknown'],
    },
    'rmg-templates-upload': {
        name: 'RMG Templates - Upload',
        url: '/rmg-templates/#/new',
        assetType: 'app',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'Tauri', 'localhost', 'unknown'],
    },
    'rmp-gallery': {
        name: 'RMP Gallery',
        url: '/rmp-gallery/',
        assetType: 'app',
        showContributors: true,
        showDonators: true,
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'Tauri', 'localhost', 'unknown'],
    },
    'rmp-designer': {
        name: 'RMP Designer',
        url: '/rmp-designer/',
        assetType: 'app',
    },
    'rmg-components': {
        name: 'Components',
        url: '/rmg-components/',
        assetType: 'devtool',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'svg-assets': {
        name: 'SVG Assets',
        url: '/svg-assets/',
        assetType: 'devtool',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'rmg-translate': {
        name: 'Translate',
        url: '/rmg-translate/',
        assetType: 'devtool',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'seed-project': {
        name: 'Seed Project',
        url: '/seed-project/',
        assetType: 'devtool',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'rmg-runtime': {
        name: 'Runtime Documentation',
        url: '/rmg-runtime/',
        assetType: 'devtool',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'runtime-demo': {
        name: 'Runtime Demo',
        url: '/runtime-demo/',
        assetType: 'devtool',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'localhost', 'unknown'],
        allowMultiInstances: true,
    },
    tutorial: {
        name: 'Tutorial',
        url: 'https://rmttutorial.wordpress.com',
        assetType: 'link',
    },
    'official-website': {
        name: 'Official website',
        url: 'https://railmapgen.org',
        assetType: 'link',
        allowedInstances: ['GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'github-pages': {
        name: 'GitHub Pages mirror',
        url: 'https://railmapgen.github.io',
        assetType: 'link',
        allowedInstances: ['Org', 'GitLab', 'localhost', 'unknown'],
    },
    'gitlab-pages': {
        name: 'GitLab Pages mirror',
        url: 'https://railmapgen.gitlab.io',
        assetType: 'link',
        allowedInstances: ['Org', 'GitHub', 'localhost', 'unknown'],
    },
    tauri: {
        name: 'Download desktop app',
        url: getTauriUrl(),
        assetType: 'link',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    busLineDesigner: {
        name: 'Bus Line Designer',
        url: 'https://buslinedesigner.bobliu.tech',
        assetType: 'link',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'Tauri', 'localhost', 'unknown'],
    },
    linesPaper: {
        name: 'LinesPaper线图荟',
        url: 'https://space.bilibili.com/3546659889875715',
        assetType: 'link',
        allowedInstances: ['Org', 'GitHub', 'GitLab', 'Tauri', 'localhost', 'unknown'],
    },
};

export const getAvailableAsset = (assetType: AssetType, env: RmgEnv, instance: RmgInstance): string[] => {
    return Object.entries(assetEnablement)
        .filter(([, component]) => {
            const typeOk = component.assetType === assetType;
            const envOk = !component.allowedEnvs || component.allowedEnvs.includes(env);
            const instanceOk = !component.allowedInstances || component.allowedInstances.includes(instance);
            return typeOk && envOk && instanceOk;
        })
        .map(([assetId]) => assetId);
};
