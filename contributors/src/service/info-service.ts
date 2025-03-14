import { createCachedPromise } from '@railmapgen/rmg-runtime/util';

const getLegacyContributors = async (repo: string, signal?: AbortSignal): Promise<string[]> => {
    const url = `/${repo}/legacy-contributor-list.txt`;
    const res = await fetch(url, { signal });
    const data = await res.text();
    return data.split('\n');
};

export const LEGACY_CONTRIBUTOR_CACHE: Record<string, () => Promise<string[]>> = {
    'rmg-palette': createCachedPromise(() => getLegacyContributors('rmg-palette')),
    'rmg-templates': createCachedPromise(() => getLegacyContributors('rmg-templates')),
};
