import rmgRuntime from '@railmapgen/rmg-runtime';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { createTestStore, render } from '../../test-utils';
import { apiFetch } from '../../util/api';
import { API_ENDPOINT } from '../../util/constants';
import RedeemModal from './redeem-modal';

vi.mock('../../util/api', async importOriginal => ({
    ...(await importOriginal<typeof import('../../util/api')>()),
    apiFetch: vi.fn(),
}));

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

describe('RedeemModal App Store subscription entry', () => {
    const postMessage = vi.fn();
    let originalWebkit: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalWebkit = Object.getOwnPropertyDescriptor(window, 'webkit');
        Object.defineProperty(window, 'webkit', {
            configurable: true,
            value: { messageHandlers: { rmtSubscriptions: { postMessage } } },
        });
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        postMessage
            .mockReset()
            .mockImplementation(async message =>
                message.type === 'configuration'
                    ? { channel: 'stable', environment: 'PRODUCTION' }
                    : { status: 'cancelled', transactions: [] }
            );
        vi.mocked(apiFetch)
            .mockReset()
            .mockResolvedValue({
                status: 200,
                ok: true,
                json: async () => ({
                    enabled: true,
                    claimRequired: false,
                    allowedEnvironments: ['PRODUCTION'],
                    subscriptionGroupId: '22559988',
                    products: [{ productId: 'subscription_ultimate' }],
                }),
            } as Response);
    });

    afterEach(() => {
        if (originalWebkit) Object.defineProperty(window, 'webkit', originalWebkit);
        else Reflect.deleteProperty(window, 'webkit');
        vi.restoreAllMocks();
    });

    it('keeps the latest subscription comparison and replaces only the acquisition area with Apple IAP', async () => {
        const initial = createTestStore().getState();
        const store = createTestStore({
            account: { ...initial.account, isLoggedIn: true, id: 7, token: 'account-token' },
        });
        const onClose = vi.fn();
        render(<RedeemModal opened onClose={onClose} />, { store });
        const dialog = screen.getByRole('dialog', { name: /^Find your way to create/ });
        const comparison = within(dialog).getByRole('table', { name: 'Features & benefits' });
        expect(within(comparison).getAllByRole('columnheader')).toHaveLength(5);
        for (const description of [
            'Start creating',
            'Drawing & cloud sync',
            'Sharing & quality exports',
            'The complete experience',
        ]) {
            expect(within(comparison).getByText(description)).toBeInTheDocument();
        }
        expect(within(comparison).getByRole('rowheader', { name: 'Maximum video quality' })).toBeInTheDocument();
        expect(within(comparison).getByRole('rowheader', { name: 'Watermark-free video' })).toBeInTheDocument();
        expect(screen.queryAllByRole('link')).toHaveLength(0);
        expect(screen.queryAllByRole('textbox')).toHaveLength(0);
        expect(screen.queryByText('爱发电')).not.toBeInTheDocument();
        expect(screen.queryByText('Community Reviews')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Redeem' })).not.toBeInTheDocument();
        expect(screen.queryByText('Already have a code?')).not.toBeInTheDocument();

        const subscribe = screen.getByRole('button', { name: 'Subscribe with App Store' });
        fireEvent.click(subscribe);
        fireEvent.click(subscribe);
        await waitFor(() =>
            expect(postMessage).toHaveBeenCalledWith({
                type: 'purchase',
                productIDs: ['subscription_ultimate'],
                subscriptionGroupID: '22559988',
                language: rmgRuntime.getLanguage(),
                allowedEnvironments: ['PRODUCTION'],
            })
        );
        await waitFor(() => expect(screen.getByRole('button', { name: 'Subscribe with App Store' })).toBeEnabled());
        expect(onClose).not.toHaveBeenCalled();
        expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    it('retains external links and the redemption input on web builds', () => {
        vi.mocked(rmgRuntime.getInstance).mockReturnValue('GitHub');
        render(<RedeemModal opened onClose={vi.fn()} />);
        expect(screen.getByRole('dialog', { name: /^Find your way to create/ })).toBeInTheDocument();
        expect(screen.getByRole('table', { name: 'Features & benefits' })).toBeInTheDocument();
        expect(screen.getByText('The complete experience')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /爱发电/ })).toHaveAttribute(
            'href',
            'https://ifdian.net/item/9c8b220c614311efab2d52540025c377'
        );
        expect(screen.getByRole('link', { name: /Community Reviews/ })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'CDKey' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Subscribe with App Store' })).not.toBeInTheDocument();
    });

    it('keeps mobile plan controls with the title while switching the comparison column', () => {
        vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
            media: query,
            matches: query === '(max-width: 900px)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        render(<RedeemModal opened onClose={vi.fn()} />);

        const dialog = screen.getByRole('dialog', { name: /^Find your way to create/ });
        const title = within(dialog).getByRole('heading', { name: /^Find your way to create/ });
        const header = title.closest('header')!;
        const plans = within(header).getByRole('group', { name: 'Choose a subscription to view' });
        const comparison = within(dialog).getByRole('table', { name: 'Features & benefits' });
        expect(title).not.toContainElement(plans);
        expect(header).not.toContainElement(comparison);
        expect(within(plans).getAllByRole('button')).toHaveLength(4);
        expect(within(comparison).getAllByRole('columnheader')).toHaveLength(2);
        expect(within(plans).getByRole('button', { name: 'Proceed Signal' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(comparison).getByRole('columnheader', { name: /Drawing & cloud sync/ })).toBeVisible();

        fireEvent.click(within(plans).getByRole('button', { name: 'Ultimate' }));

        expect(within(plans).getByRole('button', { name: 'Ultimate' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(plans).getByRole('button', { name: 'Proceed Signal' })).toHaveAttribute('aria-pressed', 'false');
        expect(within(comparison).getAllByRole('columnheader')).toHaveLength(2);
        expect(within(comparison).getByRole('columnheader', { name: /The complete experience/ })).toBeVisible();
        expect(
            within(comparison).queryByRole('columnheader', { name: /Drawing & cloud sync/ })
        ).not.toBeInTheDocument();
    });

    it('keeps the dialog open and reports a native bridge failure', async () => {
        const initial = createTestStore().getState();
        const store = createTestStore({
            account: { ...initial.account, isLoggedIn: true, id: 7, token: 'account-token' },
        });
        const onClose = vi.fn();
        postMessage.mockRejectedValue(new Error('Store unavailable'));
        render(<RedeemModal opened onClose={onClose} />, { store });
        fireEvent.click(screen.getByRole('button', { name: 'Subscribe with App Store' }));
        await waitFor(() => expect(store.getState().notification.notifications).toHaveLength(1));
        expect(store.getState().notification.notifications[0]).toMatchObject({
            type: 'error',
            message: 'Store unavailable',
        });
        expect(onClose).not.toHaveBeenCalled();
        expect(rmgRuntime.postEvent).not.toHaveBeenCalled();
    });
});
