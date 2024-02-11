import { assetEnablement } from '../../util/asset-enablements';
import { useEffect, useRef, useState } from 'react';
import { getContributorsByPage } from '../../service/github-api-service';
import { getLegacyContributors } from '../../service/info-service';
import useAppendingSet from './use-appending-set';

const FILTERED_CONTRIBUTORS = ['', 'wongchito', 'thekingofcity', 'github-actions[bot]'];
const contributorFilter = (id: string) => !FILTERED_CONTRIBUTORS.includes(id);

export default function useContributors(appId: string) {
    const [contributors, appendContributors] = useAppendingSet<string>();
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const controllerRef = useRef<AbortController>();

    const getGitHubContributors = async () => {
        let page = 1;
        while (true) {
            controllerRef.current = new AbortController();
            const pageResult = await getContributorsByPage(appId, page, controllerRef.current?.signal);
            appendContributors(pageResult.filter(contributorFilter));
            if (pageResult.length < 100) {
                break;
            } else {
                page++;
            }
        }
    };

    useEffect(() => {
        getGitHubContributors()
            .then(() => {
                if (assetEnablement[appId].legacyContributors) {
                    controllerRef.current = new AbortController();
                    return getLegacyContributors(appId, controllerRef.current?.signal);
                } else {
                    return [];
                }
            })
            .then(legacyResult => appendContributors(legacyResult.filter(contributorFilter)))
            .catch(err => {
                console.error('[rmt] unable to fetch contributors for:', appId, err);
                setIsError(true);
            })
            .finally(() => setIsLoading(false));

        return () => {
            controllerRef.current?.abort();
            setIsLoading(true);
            setIsError(false);
        };
    }, [appId]);

    return { contributors, isLoading, isError };
}
