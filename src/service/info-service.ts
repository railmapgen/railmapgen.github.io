import { Environments } from '../util/config';
import { componentList } from '../util/constants';

const getVersion = async (environment: string, component: string) => {
    let url: string = '';
    if (environment === Environments.UAT) {
        url = `https://uat-railmapgen.github.io/${component}/info.json`;
    } else if (environment === Environments.PRD) {
        url = `https://railmapgen.github.io/${component}/info.json`;
    } else {
        return undefined;
    }
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.version as string;
    } catch (error) {
        console.log(`The version for ${component} does not exist. (Environment: ${environment})`);
        return undefined;
    }
};

export interface InfoStatus {
    id: string;
    uat?: string;
    prd?: string;
}

export const getStatus = (): Promise<InfoStatus[]> => {
    return Promise.all(
        Object.keys(componentList).map(async component => {
            return {
                id: component,
                uat: await getVersion(Environments.UAT, component),
                prd: await getVersion(Environments.PRD, component),
            };
        })
    );
};
