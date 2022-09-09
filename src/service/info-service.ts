export const getVersion = async (component: string): Promise<string> => {
    let url: string = `/${component}/info.json`;
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
