const getContributorsInner = async (repo: string, page: number): Promise<string[]> => {
    const url = `https://api.github.com/repos/railmapgen/${repo}/contributors`;
    const searchParams = new URLSearchParams({ per_page: '100', page: page.toString() });
    const res = await fetch(url + '?' + searchParams.toString());
    const data = await res.json();
    return data.map((d: Record<string, any>) => d.login);
};

export const getContributors = async (repo: string): Promise<string[]> => {
    const result = [];
    let page = 1;
    while (true) {
        const pageResult = await getContributorsInner(repo, page);
        result.push(...pageResult);
        if (pageResult.length < 100) {
            break;
        } else {
            page++;
        }
    }
    return result;
};
