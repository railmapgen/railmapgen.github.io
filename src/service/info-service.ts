export const getVersion = async (component: string): Promise<string> => {
    const url = `/${component}/info.json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.version as string;
    } catch (error) {
        console.log(`Failed to get version for ${component}`);
        return 'unknown';
    }
};

export interface InfoStatus {
    id: string;
    uat?: string;
    prd?: string;
}

export const getStatus = (): Promise<InfoStatus[]> => {
    return Promise.all(
        Object.keys({}).map(async component => {
            return {
                id: component,
                uat: await getVersion(component),
                prd: await getVersion(component),
            };
        })
    );
};

export const getLegacyContributors = async (repo: string, signal?: AbortSignal): Promise<string[]> => {
    const url = `/${repo}/legacy-contributor-list.txt`;
    const res = await fetch(url, { signal });
    const data = await res.text();
    return data.split('\n');
};
