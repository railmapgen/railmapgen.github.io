import { useEffect, useRef, useState } from 'react';
import { getDonatorsByPage } from '../../service/github-api-service';
import { assetEnablement } from '../../util/asset-enablements';
import useAppendingSet from './use-appending-set';
import { logger } from '@railmapgen/rmg-runtime';

export default function useDonators() {
    const [donators, appendDonators] = useAppendingSet<string>();
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const controllerRef = useRef<AbortController>(null);

    const getGitHubDonators = async () => {
        const appIds = Object.entries(assetEnablement)
            .filter(([, detail]) => detail.showDonators)
            .map(([appId]) => appId);

        for (const appId of appIds) {
            try {
                let page = 0;
                while (++page) {
                    controllerRef.current = new AbortController();
                    const pageResult = await getDonatorsByPage(appId, page, controllerRef.current?.signal);
                    appendDonators(pageResult);
                    if (pageResult.length < 100) {
                        break;
                    }
                }
            } catch (err) {
                logger.error('unable to fetch donators for:', appId, err);
                throw err;
            }
        }
    };

    useEffect(() => {
        getGitHubDonators()
            .catch(() => setIsError(true))
            .finally(() => setIsLoading(false));

        return () => {
            controllerRef.current?.abort();
            setIsLoading(true);
            setIsError(false);
        };
    }, []);

    return { donators, isLoading, isError };
}
