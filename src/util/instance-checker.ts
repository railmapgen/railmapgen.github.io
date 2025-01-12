import store from '../redux';
import { terminateSession } from '../redux/app/app-slice';
import { clearAllListeners } from '@reduxjs/toolkit';
import { wait } from './utils';
import { logger } from '@railmapgen/rmg-runtime';

const CHANNEL_NAME = 'rmt-instance-checker';
const INSTANCE_ID = crypto.randomUUID();
const PING = 'ping';
const PONG = 'pong';
const RESTART = 'restart';
const channel = new BroadcastChannel(CHANNEL_NAME);

const pingHandler = (ev: MessageEvent) => {
    const { event, instance } = ev.data;
    if (event === PING) {
        logger.info(`Received ping from another RMT instance ${instance}.`);
        channel.postMessage({ event: PONG, instance: INSTANCE_ID });
    }
};
channel.addEventListener('message', pingHandler);

channel.addEventListener('message', ev => {
    const { event, instance } = ev.data;
    if (event === RESTART) {
        logger.info(`Received restart from another RMT instance ${instance}. Closing current session...`);
        channel.close();
        store.dispatch(terminateSession());
        store.dispatch(clearAllListeners());
    }
});
export const restartRMT = () => {
    channel.postMessage({ event: RESTART, instance: INSTANCE_ID });
};

export const checkInstance = async (): Promise<boolean> => {
    let isPrimary = true;
    channel.addEventListener('message', ev => {
        const { event, instance } = ev.data;
        if (event === PONG) {
            logger.warn(`Received pong from another RMT instance ${instance}. This instance is not primary.`);
            isPrimary = false;
            channel.removeEventListener('message', pingHandler);
        }
    });

    channel.postMessage({ event: PING, instance: INSTANCE_ID });

    let retry = 5;
    while (retry--) {
        await wait(500);
        if (!isPrimary) {
            return false;
        }
    }

    logger.info('This instance is primary.');
    return true;
};

export const closeChannel = () => {
    channel.close();
};
