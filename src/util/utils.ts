export const wait = (ms: number) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms, `Timeout after ${ms / 1000} seconds`);
    });
};

export const isSafari = () => {
    const ua = navigator.userAgent;
    return ua.includes('Safari') && !ua.includes('Chrome');
};

export const constructUrl = (pathname: string, search?: string, hash?: string): string => {
    const url = new URL(pathname, window.location.href);
    url.search = search ?? '';
    url.hash = hash ?? '';
    return url.pathname + url.search + url.hash;
};
