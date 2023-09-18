import { appEnablement, AppId } from './constants';
import { getContributors } from '../service/github-api-service';
import { getLegacyContributors } from '../service/info-service';

const filteredContributors = ['', 'wongchito', 'thekingofcity', 'github-actions[bot]'];
const CONTRIBUTORS_CACHE: Partial<Record<AppId, string[]>> = {};

export const getAllContributors = async (appId: AppId): Promise<string[] | undefined> => {
    const { showContributors, legacyContributors } = appEnablement[appId];

    if (!showContributors) {
        return [];
    }

    if (appId in CONTRIBUTORS_CACHE) {
        return CONTRIBUTORS_CACHE[appId];
    }

    const contributorPromises = [getContributors(appId)];
    if (legacyContributors) {
        contributorPromises.push(getLegacyContributors(appId));
    }

    try {
        const result = await Promise.all(contributorPromises);
        const contributorSet = new Set(result.flat());
        const filteredResult = Array.from(contributorSet).filter(
            contributor => !filteredContributors.includes(contributor)
        );
        CONTRIBUTORS_CACHE[appId] = filteredResult;
        return filteredResult;
    } catch (error) {
        console.error('[rmt] unable to fetch contributors for:', appId);
        return undefined;
    }
};
