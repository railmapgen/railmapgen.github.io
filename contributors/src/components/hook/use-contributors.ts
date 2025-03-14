import { assetEnablement } from '../../../../src/util/asset-enablements';
import { useEffect, useState } from 'react';
import { CONTRIBUTOR_CACHE } from '../../service/github-api-service';
import { LEGACY_CONTRIBUTOR_CACHE } from '../../service/info-service';
import useAppendingSet from './use-appending-set';
import { logger } from '@railmapgen/rmg-runtime';

const FILTERED_CONTRIBUTORS = ['', 'wongchito', 'thekingofcity', 'github-actions[bot]'];
const contributorFilter = (id: string) => !FILTERED_CONTRIBUTORS.includes(id);

export default function useContributors(appId: string) {
    const [contributors, appendContributors] = useAppendingSet<string>();
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        CONTRIBUTOR_CACHE[appId]()
            .then(contributors => appendContributors(contributors.filter(contributorFilter)))
            .then(() => {
                if (assetEnablement[appId].legacyContributors) {
                    return LEGACY_CONTRIBUTOR_CACHE[appId]();
                } else {
                    return [];
                }
            })
            .then(legacyResult => appendContributors(legacyResult.filter(contributorFilter)))
            .catch(err => {
                logger.error('unable to fetch contributors for:', appId, err);
                setIsError(true);
            })
            .finally(() => setIsLoading(false));

        return () => {
            setIsLoading(true);
            setIsError(false);
        };
    }, [appId]);

    return { contributors, isLoading, isError };
}
