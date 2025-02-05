import { waitFor } from '@testing-library/react';

let testChannel: BroadcastChannel;
let messagesReceived: unknown[] = [];

const INSTANCE_ID = 'test-instance';

describe('InstanceChecker', () => {
    beforeEach(() => {
        vi.resetModules();
        testChannel = new BroadcastChannel('rmt-instance-checker');
    });

    afterEach(() => {
        messagesReceived = [];
        testChannel.close();
    });

    it('Can emit PONG event if instance is primary', async () => {
        testChannel.onmessage = ev => messagesReceived.push(ev.data);

        const { checkInstance, closeChannel } = await import('./instance-checker');

        // assert isPrimary
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeTruthy();

        // test channel is not primary
        testChannel.postMessage({ event: 'ping', instance: INSTANCE_ID });
        await Promise.resolve();
        await waitFor(() => expect(messagesReceived).toHaveLength(2));
        expect(messagesReceived).toContainEqual({ event: 'pong', instance: expect.any(String) });

        closeChannel();
    });

    it('Can check current instance is secondary when received PONG', async () => {
        // start test channel
        testChannel.onmessage = ev => {
            messagesReceived.push(ev.data);

            if (ev.data.event === 'ping') {
                testChannel.postMessage({ event: 'pong', instance: INSTANCE_ID });
            }
        };

        // assert not isPrimary
        const { checkInstance, closeChannel } = await import('./instance-checker');
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeFalsy();

        // test channel received ping
        await waitFor(() => expect(messagesReceived).toHaveLength(1));
        expect(messagesReceived).toContainEqual({ event: 'ping', instance: expect.any(String) });

        closeChannel();
    });

    it('Can terminate current session when received RESTART', async () => {
        testChannel.onmessage = ev => messagesReceived.push(ev.data);

        const { default: store } = await import('../redux');
        const { checkInstance, closeChannel } = await import('./instance-checker');

        // assert isPrimary
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeTruthy();

        // test channel is not primary
        testChannel.postMessage({ event: 'restart', instance: INSTANCE_ID });

        // session is terminated
        await waitFor(() => expect(store.getState().app.isTerminated).toBeTruthy());

        closeChannel();
    });
});
