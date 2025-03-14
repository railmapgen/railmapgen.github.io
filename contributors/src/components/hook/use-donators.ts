import { useEffect, useState } from 'react';
import { DONATOR_CACHE } from '../../service/github-api-service';
import { assetEnablement } from '../../../../src/util/asset-enablements';
import useAppendingSet from './use-appending-set';
import { logger } from '@railmapgen/rmg-runtime';

export default function useDonators() {
    const [donators, appendDonators] = useAppendingSet<string>();
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const getGitHubDonators = async () => {
        const appIds = Object.entries(assetEnablement)
            .filter(([, detail]) => detail.showDonators)
            .map(([appId]) => appId);

        for (const appId of appIds) {
            try {
                appendDonators(await DONATOR_CACHE[appId]());
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
            setIsLoading(true);
            setIsError(false);
        };
    }, []);

    return { donators, isLoading, isError };
}
