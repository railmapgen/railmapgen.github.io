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
    },
    'rmg-templates-upload': {
        name: 'RMG Templates - Upload',
        url: '/rmg-templates/#/new',
        assetType: 'app',
    },
    'rmp-gallery': {
        name: 'RMP Gallery',
        url: '/rmp-gallery/',
        assetType: 'app',
        showContributors: true,
        showDonators: true,
    },
    'rmg-components': {
        name: 'Components',
        url: '/rmg-components/',
        assetType: 'devtool',
        allowedInstances: ['GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'svg-assets': {
        name: 'SVG Assets',
        url: '/svg-assets/',
        assetType: 'devtool',
        allowedInstances: ['GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'rmg-translate': {
        name: 'Translate',
        url: '/rmg-translate/',
        assetType: 'devtool',
        allowedInstances: ['GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'seed-project': {
        name: 'Seed Project',
        url: '/seed-project/',
        assetType: 'devtool',
        allowedInstances: ['GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    'runtime-demo': {
        name: 'Runtime Demo',
        url: '/runtime-demo/',
        assetType: 'devtool',
        allowedInstances: ['GitHub', 'GitLab', 'localhost', 'unknown'],
    },
    tutorial: {
        name: 'Tutorial',
        url: 'https://rmttutorial.wordpress.com',
        assetType: 'link',
    },
    'github-pages': {
        name: 'GitHub Pages mirror',
        url: 'https://railmapgen.github.io',
        assetType: 'link',
        allowedInstances: ['GitLab', 'Gitee', 'localhost', 'unknown'],
    },
    'gitlab-pages': {
        name: 'GitLab Pages mirror',
        url: 'https://railmapgen.gitlab.io',
        assetType: 'link',
        allowedInstances: ['GitHub', 'Gitee', 'localhost', 'unknown'],
    },
    'gitee-pages': {
        name: 'Gitee Pages mirror',
        url: 'https://railmapgen.gitee.io',
        assetType: 'link',
        allowedInstances: ['localhost'],
    },
    tauri: {
        name: 'Download desktop app',
        url: getTauriUrl(),
        assetType: 'link',
        allowedInstances: ['GitHub', 'GitLab', 'Gitee', 'localhost', 'unknown'],
    },
};

export const getAvailableAsset = (assetType: AssetType, env: RmgEnv, instance: RmgInstance): string[] => {
    return Object.entries(assetEnablement)
        .filter(([_, component]) => {
            const typeOk = component.assetType === assetType;
            const envOk = !component.allowedEnvs || component.allowedEnvs.includes(env);
            const instanceOk = !component.allowedInstances || component.allowedInstances.includes(instance);
            return typeOk && envOk && instanceOk;
        })
        .map(([assetId]) => assetId);
};
