export const getContributors = async (repo: string): Promise<string[]> => {
    const url = `https://api.github.com/repos/railmapgen/${repo}/contributors`;
    const res = await fetch(url);
    const data = await res.json();
    return data.map((d: Record<string, any>) => d.login);
};
