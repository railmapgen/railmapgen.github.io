import store from '../redux';
import { terminateSession } from '../redux/app/app-slice';
import { clearAllListeners } from '@reduxjs/toolkit';
import { wait } from './utils';

const CHANNEL_NAME = 'rmt-instance-checker';
const PING = 'ping';
const PONG = 'pong';
const RESTART = 'restart';
const channel = new BroadcastChannel(CHANNEL_NAME);

const pingHandler = (ev: MessageEvent) => {
    if (ev.data === PING) {
        console.log('[rmt] Received ping from another RMT instance.');
        channel.postMessage(PONG);
    }
};
channel.addEventListener('message', pingHandler);

channel.addEventListener('message', ev => {
    if (ev.data === RESTART) {
        console.log('[rmt] Received restart from another RMT instance. Closing current session...');
        channel.close();
        store.dispatch(terminateSession());
        store.dispatch(clearAllListeners());
    }
});
export const restartRMT = () => {
    channel.postMessage(RESTART);
};

export const checkInstance = async (): Promise<boolean> => {
    let isPrimary = true;
    channel.addEventListener('message', ev => {
        if (ev.data === PONG) {
            console.warn('[rmt] Received pong from another RMT instance. This instance is not primary.');
            isPrimary = false;
            channel.removeEventListener('message', pingHandler);
        }
    });

    channel.postMessage(PING);

    let retry = 5;
    while (retry--) {
        await wait(500);
        if (!isPrimary) {
            return false;
        }
    }

    console.log('[rmt] This instance is primary.');
    return true;
};

export const closeChannel = () => {
    channel.close();
};
