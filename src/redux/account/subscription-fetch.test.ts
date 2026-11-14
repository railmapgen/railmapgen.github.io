import { waitFor } from '@testing-library/react';
import { createStore } from '../index';
import { apiFetch } from '../../util/api';
import { fetchSubscription, login, setActiveSubscriptions, setToken } from './account-slice';

vi.mock('../../util/api', () => ({ apiFetch: vi.fn() }));

const loginInfo = (id: number) => ({
    id,
    name: `Account ${id}`,
    email: `account-${id}@example.com`,
    token: `token-${id}`,
    expires: '2099-01-01T00:00:00Z',
    refreshToken: `refresh-${id}`,
    refreshExpires: '2099-01-02T00:00:00Z',
});

const subscriptions = [{ type: 'RMP_CLOUD', expires: '2099-01-01T00:00:00Z' }];

describe('subscription fetch session isolation', () => {
    beforeEach(() => {
        vi.mocked(apiFetch).mockReset();
    });

    it('does not overwrite another account when the old response body completes later', async () => {
        const store = createStore();
        store.dispatch(login(loginInfo(1)));
        let completeBody!: (value: unknown) => void;
        const json = vi.fn(
            () =>
                new Promise(resolve => {
                    completeBody = resolve;
                })
        );
        vi.mocked(apiFetch).mockResolvedValue({ status: 200, json } as unknown as Response);
        const request = store.dispatch(fetchSubscription());
        await waitFor(() => expect(json).toHaveBeenCalledOnce());

        store.dispatch(login(loginInfo(2)));
        store.dispatch(setActiveSubscriptions({ RMP_EXPORT: '2098-01-01T00:00:00Z' }));
        completeBody({ subscriptions });

        const result = await request;
        expect(result.meta.requestStatus).toBe('rejected');
        expect(store.getState().account).toMatchObject({
            id: 2,
            isLoggedIn: true,
            activeSubscriptions: { RMP_EXPORT: '2098-01-01T00:00:00Z' },
        });
        expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBeUndefined();
        expect(store.getState().notification.notifications).toHaveLength(0);
    });

    it('does not log out a new account when an earlier account request returns 401', async () => {
        const store = createStore();
        store.dispatch(login(loginInfo(1)));
        let completeRequest!: (value: Response) => void;
        vi.mocked(apiFetch).mockImplementation(
            () =>
                new Promise(resolve => {
                    completeRequest = resolve;
                })
        );
        const request = store.dispatch(fetchSubscription());
        store.dispatch(login(loginInfo(2)));
        completeRequest({ status: 401 } as Response);

        const result = await request;
        expect(result.meta.requestStatus).toBe('rejected');
        expect(store.getState().account).toMatchObject({ id: 2, isLoggedIn: true, token: 'token-2' });
        expect(store.getState().notification.notifications).toHaveLength(0);
    });

    it('does not invalidate the refreshed token when an earlier token returns 401', async () => {
        const store = createStore();
        store.dispatch(login(loginInfo(1)));
        let completeRequest!: (value: Response) => void;
        vi.mocked(apiFetch).mockImplementation(
            () =>
                new Promise(resolve => {
                    completeRequest = resolve;
                })
        );
        const request = store.dispatch(fetchSubscription());
        store.dispatch(setToken({ access: 'new-access-token', refresh: 'new-refresh-token' }));
        completeRequest({ status: 401 } as Response);

        await request;
        expect(store.getState().account).toMatchObject({ id: 1, isLoggedIn: true, token: 'new-access-token' });
        expect(store.getState().notification.notifications).toHaveLength(0);
    });

    it('still refreshes a logged-in legacy session without an account ID', async () => {
        const initial = createStore().getState();
        const store = createStore({ account: { ...initial.account, isLoggedIn: true, token: 'legacy-token' } });
        vi.mocked(apiFetch).mockResolvedValue({
            status: 200,
            json: async () => ({ subscriptions }),
        } as Response);

        const result = await store.dispatch(fetchSubscription());
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(subscriptions[0].expires);
    });

    it("uses each feature's greatest expiry even when duplicate rows are unsorted", async () => {
        const store = createStore();
        store.dispatch(login(loginInfo(1)));
        vi.mocked(apiFetch).mockResolvedValue({
            status: 200,
            json: async () => ({
                subscriptions: [
                    { type: 'RMP_CLOUD', expires: '2099-01-01T00:00:00Z' },
                    { type: 'RMP_EXPORT', expires: '2098-01-01T00:00:00Z' },
                    { type: 'RMP_CLOUD', expires: '2097-01-01T00:00:00Z' },
                    { type: 'RMP_EXPORT', expires: '2099-01-01T00:30:00+08:00' },
                    { type: 'RMP_EXPORT', expires: '2098-12-31T20:00:00Z' },
                    { type: 'RMP_EXPORT', expires: '2097-01-01T00:00:00Z' },
                ],
            }),
        } as Response);

        const result = await store.dispatch(fetchSubscription());
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(store.getState().account.activeSubscriptions).toEqual({
            RMP_CLOUD: '2099-01-01T00:00:00Z',
            RMP_EXPORT: '2098-12-31T20:00:00Z',
        });
    });

    it('ignores invalid dates and unsupported types without losing valid expiry values', async () => {
        const store = createStore();
        store.dispatch(login(loginInfo(1)));
        vi.mocked(apiFetch).mockResolvedValue({
            status: 200,
            json: async () => ({
                subscriptions: [
                    { type: 'RMP_CLOUD', expires: '2099-01-01T00:00:00Z' },
                    { type: 'RMP_CLOUD', expires: 'invalid-date' },
                    { type: 'RMP_CLOUD', expires: null },
                    { type: 'RMP_EXPORT', expires: '' },
                    { type: 'RMP_EXPORT', expires: 9999999999999 },
                    { type: 'RMP', expires: '2099-01-01T00:00:00Z' },
                    { type: 'UNKNOWN', expires: '2099-01-01T00:00:00Z' },
                    { type: 'toString', expires: '2099-01-01T00:00:00Z' },
                    { type: { toString: 'invalid-type' }, expires: '2099-01-01T00:00:00Z' },
                    null,
                ],
            }),
        } as Response);

        const result = await store.dispatch(fetchSubscription());
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(store.getState().account.activeSubscriptions).toEqual({
            RMP_CLOUD: '2099-01-01T00:00:00Z',
            RMP_EXPORT: undefined,
        });
    });
});
