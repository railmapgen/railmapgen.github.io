import { logger } from '@railmapgen/rmg-runtime';

export const getVersion = async (component: string): Promise<string> => {
    const url = `/${component}/info.json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.version as string;
    } catch (error) {
        logger.info(`Failed to get version of ${component}`, error);
        return 'unknown';
    }
};
