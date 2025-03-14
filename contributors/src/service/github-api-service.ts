import { createCachedPromise } from '@railmapgen/rmg-runtime/util';

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

type PaginatedCallback<T, R> = (page: number, ...args: T[]) => Promise<R[]>;

const getAllPages = async <T, R>(paginatedCallback: PaginatedCallback<T, R>, ...args: T[]) => {
    const results: R[] = [];
    let page = 0;
    while (++page) {
        const pageResult = await paginatedCallback(page, ...args);
        results.push(...pageResult);
        if (pageResult.length < 100) {
            break;
        }
    }
    return results;
};

const getContributorsByPage: PaginatedCallback<string, string> = async (page: number, repo: string) => {
    const url = `${BASE_URL}/${repo}/contributors`;
    const searchParams = new URLSearchParams({ per_page: '100', page: page.toString() });
    const data = await cachedFetch<GitHubUser[]>(url + '?' + searchParams.toString());
    return data.map(d => d.login);
};

const getAllContributors = (repo: string) => getAllPages(getContributorsByPage, repo);

export const CONTRIBUTOR_CACHE: Record<string, () => Promise<string[]>> = {
    'rmg-palette': createCachedPromise(() => getAllContributors('rmg-palette')),
    'rmg-templates': createCachedPromise(() => getAllContributors('rmg-templates')),
    'rmp-gallery': createCachedPromise(() => getAllContributors('rmp-gallery')),
};

const getDonatorsByPage = async (page: number, repo: string): Promise<string[]> => {
    const url = `${BASE_URL}/${repo}/issues`;
    const searchParams = new URLSearchParams({
        state: 'closed',
        labels: 'donation',
        per_page: '100',
        page: page.toString(),
    });
    const data = await cachedFetch<GitHubIssue[]>(url + '?' + searchParams.toString());
    return data.filter(d => d.state_reason === 'completed').map(d => d.user?.login);
};

const getAllDonators = (repo: string) => getAllPages(getDonatorsByPage, repo);

export const DONATOR_CACHE: Record<string, () => Promise<string[]>> = {
    'rmp-gallery': createCachedPromise(() => getAllDonators('rmp-gallery')),
};
