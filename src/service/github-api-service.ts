const BASE_URL = 'https://api.github.com/repos/railmapgen';
const RESPONSE_CACHE: Record<string, unknown> = {};

export const cachedFetch = async <T>(url: string, init?: RequestInit): Promise<T> => {
    if (url in RESPONSE_CACHE) {
        return RESPONSE_CACHE[url] as T;
    }

    const res = await fetch(url, init);
    const data = await res.json();
    RESPONSE_CACHE[url] = data;
    return data;
};

type GitHubUser = {
    login: string;
};

type GitHubIssue = {
    user: GitHubUser;
    state_reason: string;
};

export const getContributorsByPage = async (repo: string, page: number, signal?: AbortSignal): Promise<string[]> => {
    const url = `${BASE_URL}/${repo}/contributors`;
    const searchParams = new URLSearchParams({ per_page: '100', page: page.toString() });
    const data = await cachedFetch<GitHubUser[]>(url + '?' + searchParams.toString(), { signal });
    return data.map(d => d.login);
};

export const getDonatorsByPage = async (repo: string, page: number, signal?: AbortSignal): Promise<string[]> => {
    const url = `${BASE_URL}/${repo}/issues`;
    const searchParams = new URLSearchParams({
        state: 'closed',
        labels: 'donation',
        per_page: '100',
        page: page.toString(),
    });
    const data = await cachedFetch<GitHubIssue[]>(url + '?' + searchParams.toString(), { signal });
    return data.filter(d => d.state_reason === 'completed').map(d => d.user?.login);
};
