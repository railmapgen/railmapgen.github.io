const RESPONSE_CACHE: Record<string, any> = {};

export const cachedFetch = async (url: string, init?: RequestInit): Promise<any> => {
    if (url in RESPONSE_CACHE) {
        return RESPONSE_CACHE[url];
    }

    const res = await fetch(url, init);
    const data = await res.json();
    RESPONSE_CACHE[url] = data;
    return data;
};

export const getContributorsByPage = async (repo: string, page: number, signal?: AbortSignal): Promise<string[]> => {
    const url = `https://api.github.com/repos/railmapgen/${repo}/contributors`;
    const searchParams = new URLSearchParams({ per_page: '100', page: page.toString() });
    const data = await cachedFetch(url + '?' + searchParams.toString(), { signal });
    return data.map((d: Record<string, any>) => d.login);
};
