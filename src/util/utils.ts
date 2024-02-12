export const wait = (ms: number) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms, `Timeout after ${ms / 1000} seconds`);
    });
};

export const isSafari = () => {
    const ua = navigator.userAgent;
    return ua.includes('Safari') && !ua.includes('Chrome');
};
