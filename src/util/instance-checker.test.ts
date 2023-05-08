import { closeAllChannels } from '../mock-broadcast-channel';
import { vi } from 'vitest';

describe('InstanceChecker', () => {
    beforeEach(() => {
        vi.resetModules();
        closeAllChannels();
    });

    it('Can emit PONG event if instance is primary', async () => {
        const { checkInstance } = await import('./instance-checker');

        // assert isPrimary
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeTruthy();

        // start test channel
        const messagesReceived: any[] = [];
        const testChannel = new BroadcastChannel('rmt-instance-checker');
        testChannel.onmessage = ev => messagesReceived.push(ev.data);

        // test channel is not primary
        testChannel.postMessage('ping');
        await Promise.resolve();
        expect(messagesReceived).toHaveLength(1);
        expect(messagesReceived).toContain('pong');
    });

    it('Can check current instance is secondary when received PONG', async () => {
        // start test channel
        const messagesReceived: any[] = [];
        const testChannel = new BroadcastChannel('rmt-instance-checker');
        testChannel.onmessage = ev => {
            messagesReceived.push(ev.data);

            if (ev.data === 'ping') {
                testChannel.postMessage('pong');
            }
        };

        // assert not isPrimary
        const { checkInstance } = await import('./instance-checker');
        const isPrimary = await checkInstance();
        expect(isPrimary).toBeFalsy();

        // test channel received ping
        expect(messagesReceived).toHaveLength(1);
        expect(messagesReceived).toContain('ping');
    });
});
