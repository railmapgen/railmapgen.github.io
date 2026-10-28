import rmgRuntime from '@railmapgen/rmg-runtime';
import { act, fireEvent, screen } from '@testing-library/react';
import AccountView from '../components/menu/account-view/account-view';
import { login, logout } from '../redux/account/account-slice';
import { setAccountPage, setIsPrimary, setMenuView, terminateSession } from '../redux/app/app-slice';
import { createTestStore, render } from '../test-utils';
import { FRAME_ID_PREFIX } from './constants';
import { registerSubscriptionRedemption } from './subscription-redemption';

const loginInfo = {
    id: 42,
    name: 'Tester',
    email: 'tester@example.com',
    token: 'test-token',
    expires: '2099-01-01T00:00:00Z',
    refreshToken: 'test-refresh-token',
    refreshExpires: '2099-01-02T00:00:00Z',
};

describe('subscription redemption entry', () => {
    let request: (data: unknown, frameId?: string) => void;
    let frame: HTMLIFrameElement;

    beforeEach(() => {
        vi.spyOn(rmgRuntime, 'onMessage').mockImplementation((event, callback) => {
            if (event === 'OPEN_SUBSCRIPTION_REDEMPTION') request = callback;
        });
        vi.spyOn(rmgRuntime, 'toggleNavMenu').mockImplementation(() => {});
        frame = document.createElement('iframe');
        frame.id = FRAME_ID_PREFIX + 'painter';
        document.body.append(frame);
    });

    afterEach(() => {
        frame.remove();
        vi.restoreAllMocks();
    });

    const setup = (isLoggedIn = false) => {
        const initial = createTestStore().getState();
        const store = createTestStore({
            app: {
                ...initial.app,
                isShowMenu: false,
                openedTabs: [{ id: 'painter', app: 'rmp' }],
                activeTab: 'painter',
                isPrimary: true,
            },
            account: { ...initial.account, ...(isLoggedIn ? loginInfo : {}), isLoggedIn },
        });
        registerSubscriptionRedemption(store);
        return store;
    };

    it('opens one redemption dialog and keeps the sidebar open on repeated requests', async () => {
        const store = setup(true);
        render(<AccountView />, { store });
        act(() => request(undefined, frame.id));
        expect(store.getState().app).toMatchObject({ isShowMenu: true, menuView: 'account' });
        await screen.findByRole('dialog', { name: 'Redeem your subscription' });
        expect(screen.getAllByRole('dialog', { name: 'Redeem your subscription' })).toHaveLength(1);
        fireEvent.change(screen.getByRole('textbox', { name: 'CDKey' }), { target: { value: 'keep-this-code' } });
        act(() => request(undefined, frame.id));
        expect(store.getState().app.isShowMenu).toBe(true);
        expect(screen.getAllByRole('dialog', { name: 'Redeem your subscription' })).toHaveLength(1);
        expect(screen.getByRole('textbox', { name: 'CDKey' })).toHaveValue('keep-this-code');
        expect(rmgRuntime.toggleNavMenu).toHaveBeenLastCalledWith(true);
    });

    it.each(['register', 'forgot-password'] as const)(
        'shows login from %s and never queues redemption after login',
        page => {
            const store = setup();
            store.dispatch(setAccountPage(page));
            render(<AccountView />, { store });
            act(() => request(undefined, frame.id));
            expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
            expect(store.getState().app).toMatchObject({
                isShowMenu: true,
                menuView: 'account',
                isRedeemModalOpen: false,
            });
            act(() => store.dispatch(login(loginInfo)));
            expect(screen.getByRole('button', { name: 'Redeem' })).toBeInTheDocument();
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        }
    );

    it('clears the dialog when leaving the account view or logging out', () => {
        const store = setup(true);
        request(undefined, frame.id);
        store.dispatch(setMenuView('apps'));
        expect(store.getState().app.isRedeemModalOpen).toBe(false);
        request(undefined, frame.id);
        store.dispatch(logout());
        store.dispatch(login(loginInfo));
        expect(store.getState().app.isRedeemModalOpen).toBe(false);
        expect(store.getState().app.accountPage).toBe('login');
    });

    it('ignores standalone, foreign and removed frames', () => {
        const store = setup(true);
        const before = store.getState();
        request(undefined);
        request(undefined, FRAME_ID_PREFIX + 'another-window');
        frame.remove();
        request(undefined, frame.id);
        expect(store.getState()).toBe(before);
        expect(rmgRuntime.toggleNavMenu).not.toHaveBeenCalled();
    });

    it.each(['secondary', 'terminated'])('ignores a %s RMT instance', state => {
        const store = setup(true);
        if (state === 'secondary') store.dispatch(setIsPrimary(false));
        else store.dispatch(terminateSession());
        const before = store.getState();
        request(undefined, frame.id);
        expect(store.getState()).toBe(before);
        expect(rmgRuntime.toggleNavMenu).not.toHaveBeenCalled();
    });
});
