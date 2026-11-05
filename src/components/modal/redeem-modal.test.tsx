import rmgRuntime from '@railmapgen/rmg-runtime';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createTestStore, render } from '../../test-utils';
import { apiFetch } from '../../util/api';
import { API_ENDPOINT } from '../../util/constants';
import RedeemModal from './redeem-modal';

vi.mock('../../util/api', () => ({ apiFetch: vi.fn() }));

describe('RedeemModal notifications', () => {
    afterEach(() => vi.restoreAllMocks());

    it('announces once when the redeem button is clicked again during the request', async () => {
        const initial = createTestStore().getState();
        const store = createTestStore({ account: { ...initial.account, isLoggedIn: true, token: 'test-token' } });
        let finishRedeeming!: (value: Response) => void;
        const postEvent = vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        vi.mocked(apiFetch)
            .mockReset()
            .mockImplementation(async endpoint => {
                if (endpoint === API_ENDPOINT.SUBSCRIPTION_REDEEM) {
                    return new Promise<Response>(resolve => {
                        finishRedeeming = resolve;
                    });
                }
                return { status: 200, json: async () => ({ subscriptions: [] }) } as Response;
            });
        render(<RedeemModal opened onClose={vi.fn()} />, { store });
        const button = screen.getByRole('button', { name: 'Redeem' });
        fireEvent.click(button);
        fireEvent.click(button);
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(postEvent).not.toHaveBeenCalled();
        finishRedeeming({ status: 202 } as Response);
        await waitFor(() => expect(postEvent).toHaveBeenCalledExactlyOnceWith('SUBSCRIPTION_REDEEMED', undefined));
    });

    it('keeps the dialog open and sends no success notification on a network failure', async () => {
        const initial = createTestStore().getState();
        const store = createTestStore({ account: { ...initial.account, isLoggedIn: true, token: 'test-token' } });
        const onClose = vi.fn();
        const postEvent = vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        vi.mocked(apiFetch).mockRejectedValue(new TypeError('Offline'));
        render(<RedeemModal opened onClose={onClose} />, { store });
        fireEvent.click(screen.getByRole('button', { name: 'Redeem' }));
        await waitFor(() => expect(store.getState().notification.notifications).toHaveLength(1));
        expect(postEvent).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Redeem' })).toBeEnabled();
    });

    it.each([202, 400, 401])('only announces successful redemption (HTTP %s)', async status => {
        const initial = createTestStore().getState();
        const store = createTestStore({ account: { ...initial.account, isLoggedIn: true, token: 'test-token' } });
        const onClose = vi.fn();
        const postEvent = vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        vi.mocked(apiFetch).mockImplementation(async endpoint => {
            if (endpoint === API_ENDPOINT.SUBSCRIPTION_REDEEM) {
                return { status, json: async () => ({ message: 'Invalid code' }) } as Response;
            }
            return { status: 200, json: async () => ({ subscriptions: [] }) } as Response;
        });
        render(<RedeemModal opened onClose={onClose} />, { store });
        fireEvent.change(screen.getByRole('textbox', { name: 'CDKey' }), { target: { value: ' test-code ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Redeem' }));

        await waitFor(() =>
            expect(apiFetch).toHaveBeenCalledWith(
                API_ENDPOINT.SUBSCRIPTION_REDEEM,
                { method: 'POST', body: JSON.stringify({ cdkey: 'test-code' }) },
                'test-token'
            )
        );
        if (status === 202) {
            await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
            expect(postEvent).toHaveBeenCalledExactlyOnceWith('SUBSCRIPTION_REDEEMED', undefined);
        } else {
            await waitFor(() => expect(store.getState().notification.notifications).toHaveLength(1));
            expect(postEvent).not.toHaveBeenCalled();
            if (status === 401) expect(store.getState().account.isLoggedIn).toBe(false);
        }
    });
});
