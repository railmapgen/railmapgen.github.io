import { waitFor } from '@testing-library/react';

let testChannel: BroadcastChannel;
let messagesReceived: unknown[] = [];

describe('InstanceChecker', () => {
    beforeAll(() => {
        testChannel = new BroadcastChannel('rmt-instance-checker');
    });

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        messagesReceived = [];
    });

    afterAll(() => {
        testChannel.close();
    });

    it('Can emit PONG event if instance is primary', async () => {
        testChannel.onmessage = ev => messagesReceived.push(ev.data);

        const { checkInstance, closeChannel } = await import('./instance-checker');

        // assert isPrimary
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeTruthy();

        // test channel is not primary
        testChannel.postMessage('ping');
        await Promise.resolve();
        await waitFor(() => expect(messagesReceived).toHaveLength(1));
        expect(messagesReceived).toContain('pong');

        closeChannel();
    });

    it('Can check current instance is secondary when received PONG', async () => {
        // start test channel
        testChannel.onmessage = ev => {
            messagesReceived.push(ev.data);

            if (ev.data === 'ping') {
                testChannel.postMessage('pong');
            }
        };

        // assert not isPrimary
        const { checkInstance, closeChannel } = await import('./instance-checker');
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeFalsy();

        // test channel received ping
        await waitFor(() => expect(messagesReceived).toHaveLength(1));
        expect(messagesReceived).toContain('ping');

        closeChannel();
    });

    it('Can terminate current session when received RESTART', async () => {
        testChannel.onmessage = ev => messagesReceived.push(ev.data);

        const { default: store } = await import('./../redux');
        const { checkInstance, closeChannel } = await import('./instance-checker');

        // assert isPrimary
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeTruthy();

        // test channel is not primary
        testChannel.postMessage('restart');

        // session is terminated
        await waitFor(() => expect(store.getState().app.isTerminated).toBeTruthy());

        closeChannel();
    });
});
