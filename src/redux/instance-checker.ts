const CHANNEL_NAME = 'rmt-instance-checker';
const PING = 'ping';
const PONG = 'pong';
const channel = new BroadcastChannel(CHANNEL_NAME);

channel.addEventListener('message', ev => {
    if (ev.data === PING) {
        console.log('[rmt] Received ping from another RMT instance.');
        channel.postMessage(PONG);
    }
});

export const checkInstance = async (): Promise<boolean> => {
    let isPrimary = true;
    channel.addEventListener('message', ev => {
        if (ev.data === PONG) {
            console.warn('[rmt] Received pong from another RMT instance. This instance is not primary.');
            isPrimary = false;
            channel.close();
        }
    });

    channel.postMessage(PING);

    let retry = 5;
    while (retry--) {
        await waitFor(500);
        if (!isPrimary) {
            return false;
        }
    }

    console.log('[rmt] This instance is primary.');
    return true;
};

const waitFor = (ms: number) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms, `Timeout after ${ms / 1000} seconds`);
    });
};
