import { useEffect, useRef, useState } from 'react';
import { getDonatorsByPage } from '../../service/github-api-service';
import { assetEnablement } from '../../util/asset-enablements';
import useAppendingSet from './use-appending-set';

export default function useDonators() {
    const [donators, appendDonators] = useAppendingSet<string>();
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const controllerRef = useRef<AbortController>();

    const getGitHubDonators = async () => {
        const appIds = Object.entries(assetEnablement)
            .filter(([, detail]) => detail.showDonators)
            .map(([appId]) => appId);

        for (const appId of appIds) {
            try {
                let page = 1;
                while (true) {
                    controllerRef.current = new AbortController();
                    const pageResult = await getDonatorsByPage(appId, page, controllerRef.current?.signal);
                    appendDonators(pageResult);
                    if (pageResult.length < 100) {
                        break;
                    } else {
                        page++;
                    }
                }
            } catch (err) {
                console.error('[rmt] unable to fetch donators for:', appId, err);
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
