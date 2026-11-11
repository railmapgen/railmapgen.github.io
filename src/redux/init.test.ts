import rootReducer, { RootStore } from './index';
import { createTestStore } from '../test-utils';
import { LocalStorageKey, WorkspaceTab } from '../util/constants';
import { initAccountStore, initActiveTab, initOpenedTabs, initRMPSaveStore, openSearchedApp } from './init';
import { showDevtools } from './app/app-slice';
import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { checkTokenAndRefresh } from '../util/api';

vi.mock('../util/api', async importOriginal => {
    const actual = await importOriginal<typeof import('../util/api')>();
    return { ...actual, apiFetch: vi.fn(actual.apiFetch), checkTokenAndRefresh: vi.fn() };
});

const realStore = rootReducer.getState();

const mockOpenedTabs: WorkspaceTab[] = [
    { id: '01', app: 'rmg' },
    { id: '02', app: 'rmg-palette' },
    { id: '03', app: 'runtime-demo' },
];

describe('ReduxInit', () => {
    describe('ReduxInit - initOpenedTabs', () => {
        let mockStore: RootStore;

        beforeEach(() => {
            mockStore = createTestStore();
        });

        afterEach(() => {
            rmgRuntime.storage.clear();
        });

        it('Can filter out apps of invalid asset types', () => {
            rmgRuntime.storage.set(LocalStorageKey.OPENED_TABS, JSON.stringify(mockOpenedTabs));
            initOpenedTabs(mockStore);

            const openedApps = mockStore.getState().app.openedTabs.map(tab => tab.app);
            expect(openedApps).toHaveLength(2);
            expect(openedApps).toEqual(['rmg', 'rmg-palette']);
        });

        it('Can keep devtools if toggled on', () => {
            rmgRuntime.storage.set(LocalStorageKey.OPENED_TABS, JSON.stringify(mockOpenedTabs));
            mockStore.dispatch(showDevtools());
            initOpenedTabs(mockStore);

            const openedApps = mockStore.getState().app.openedTabs.map(tab => tab.app);
            expect(openedApps).toHaveLength(3);
            expect(openedApps).toEqual(['rmg', 'rmg-palette', 'runtime-demo']);
        });
    });

    describe('ReduxInit - initActiveTab', () => {
        let mockStore: RootStore;

        beforeEach(() => {
            mockStore = createTestStore({
                app: {
                    ...realStore.app,
                    openedTabs: mockOpenedTabs,
                },
            });
        });

        afterEach(() => {
            rmgRuntime.storage.clear();
        });

        it('Can set active tab based on localStorage value as expected', () => {
            rmgRuntime.storage.set(LocalStorageKey.ACTIVE_TAB, '02');
            initActiveTab(mockStore);

            expect(mockStore.getState().app.activeTab).toBe('02');
        });

        it('Can set first tab if no activeTab defined in localStorage', () => {
            initActiveTab(mockStore);

            expect(mockStore.getState().app.activeTab).toBe('01');
        });
    });

    describe('ReduxInit - openSearchedApp', () => {
        it('Can open searched app with hash params', () => {
            const mockStore = createTestStore();
            vi.spyOn(window, 'location', 'get').mockReturnValue(
                new URL(
                    'https://railmapgen.github.io/?app=rmg&hashParams=' + encodeURIComponent('/?project=abc')
                ) as unknown as Location
            );
            openSearchedApp(mockStore);

            const { openedTabs } = mockStore.getState().app;
            expect(openedTabs[0].app).toBe('rmg');
            expect(openedTabs[0].url).toBe('/rmg/#/?project=abc');
        });

        it('Can open searched app with extra search params', () => {
            const mockStore = createTestStore();
            vi.spyOn(window, 'location', 'get').mockReturnValue(
                new URL(
                    'https://railmapgen.github.io/?app=rmp&searchParams=' + encodeURIComponent('id=123')
                ) as unknown as Location
            );
            openSearchedApp(mockStore);

            const { openedTabs } = mockStore.getState().app;
            expect(openedTabs[0].app).toBe('rmp');
            expect(openedTabs[0].url).toBe('/rmp/?id=123');
        });
    });

    describe('ReduxInit - initRMPSaveStore', () => {
        afterEach(() => {
            rmgRuntime.storage.clear();
        });

        it('Can restore base sync metadata from storage', () => {
            const mockStore = createTestStore();
            rmgRuntime.storage.set(
                LocalStorageKey.RMP_SAVE,
                JSON.stringify({
                    baseUserId: 11,
                    baseSaveId: 22,
                    baseHash: 'hash-22',
                })
            );

            initRMPSaveStore(mockStore);

            expect(mockStore.getState().rmpSave.baseUserId).toBe(11);
            expect(mockStore.getState().rmpSave.baseSaveId).toBe(22);
            expect(mockStore.getState().rmpSave.baseHash).toBe('hash-22');
            expect(rmgRuntime.storage.get(LocalStorageKey.RMP_SAVE)).toBe(
                JSON.stringify({
                    baseUserId: 11,
                    baseSaveId: 22,
                    baseHash: 'hash-22',
                })
            );
        });

        it('Can clean legacy timestamp-based metadata from storage', () => {
            const mockStore = createTestStore();
            rmgRuntime.storage.set(
                LocalStorageKey.RMP_SAVE,
                JSON.stringify({
                    lastChangedAtTimeStamp: 1742000000000,
                    resolveConflictModal: {
                        isOpen: true,
                        lastChangedAtTimeStamp: 1742000000000,
                        lastUpdatedAtTimeStamp: 1742000001000,
                        cloudData: '{"legacy":true}',
                    },
                })
            );

            initRMPSaveStore(mockStore);

            expect(mockStore.getState().rmpSave.baseUserId).toBeUndefined();
            expect(mockStore.getState().rmpSave.baseSaveId).toBeUndefined();
            expect(mockStore.getState().rmpSave.baseHash).toBeUndefined();
            expect(rmgRuntime.storage.get(LocalStorageKey.RMP_SAVE)).toBe(JSON.stringify({}));
        });

        it('Can discard unused legacy fields while preserving current base sync metadata', () => {
            const mockStore = createTestStore();
            rmgRuntime.storage.set(
                LocalStorageKey.RMP_SAVE,
                JSON.stringify({
                    baseUserId: 11,
                    baseSaveId: 22,
                    baseHash: 'hash-22',
                    lastChangedAtTimeStamp: 1742000000000,
                    resolveConflictModal: {
                        isOpen: true,
                        lastChangedAtTimeStamp: 1742000000000,
                        lastUpdatedAtTimeStamp: 1742000001000,
                        cloudData: '{"legacy":true}',
                    },
                })
            );

            initRMPSaveStore(mockStore);

            expect(mockStore.getState().rmpSave.baseUserId).toBe(11);
            expect(mockStore.getState().rmpSave.baseSaveId).toBe(22);
            expect(mockStore.getState().rmpSave.baseHash).toBe('hash-22');
            expect(rmgRuntime.storage.get(LocalStorageKey.RMP_SAVE)).toBe(
                JSON.stringify({
                    baseUserId: 11,
                    baseSaveId: 22,
                    baseHash: 'hash-22',
                })
            );
        });
    });
});

const savedAccount = {
    id: 11,
    name: 'Account user',
    email: 'user@example.test',
    token: 'access-token',
    expires: '2098-01-01T00:00:00Z',
    refreshToken: 'refresh-token',
    refreshExpires: '2099-01-01T00:00:00Z',
};
const savedSync = { baseUserId: 11, baseSaveId: 22, baseHash: 'saved-project' };

const initializeStores = () => {
    const store = createTestStore();
    initAccountStore(store);
    initRMPSaveStore(store);
    return store;
};

describe('shared account and sync session', () => {
    const postMessage = vi.fn();
    let originalWebkit: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalWebkit = Object.getOwnPropertyDescriptor(window, 'webkit');
        Object.defineProperty(window, 'webkit', {
            configurable: true,
            value: { messageHandlers: { rmtSubscriptions: { postMessage } } },
        });
        postMessage.mockReset();
        vi.useFakeTimers();
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        vi.spyOn(logger, 'debug').mockImplementation(() => {});
        vi.spyOn(logger, 'warn').mockImplementation(() => {});
        vi.mocked(checkTokenAndRefresh).mockClear();
        rmgRuntime.storage.clear();
        rmgRuntime.storage.set(LocalStorageKey.ACCOUNT, JSON.stringify(savedAccount));
        rmgRuntime.storage.set(LocalStorageKey.RMP_SAVE, JSON.stringify(savedSync));
    });

    afterEach(() => {
        if (originalWebkit) Object.defineProperty(window, 'webkit', originalWebkit);
        else Reflect.deleteProperty(window, 'webkit');
        vi.clearAllTimers();
        vi.useRealTimers();
        rmgRuntime.storage.clear();
        vi.restoreAllMocks();
    });

    it.each([
        ['stable', 'PRODUCTION'],
        ['stable', 'SANDBOX'],
        ['testflight', 'SANDBOX'],
    ])('restores the original account and sync data for %s / %s', (channel, environment) => {
        postMessage.mockResolvedValue({ channel, environment });
        const store = initializeStores();
        expect(store.getState().account).toMatchObject({ isLoggedIn: true, id: 11, token: savedAccount.token });
        expect(store.getState().rmpSave).toMatchObject(savedSync);
        expect(postMessage).not.toHaveBeenCalled();
        expect(checkTokenAndRefresh).not.toHaveBeenCalled();
    });

    it('restores the original session when the App Store bridge is unavailable', () => {
        Reflect.deleteProperty(window, 'webkit');
        const store = initializeStores();
        expect(store.getState().account).toMatchObject({ isLoggedIn: true, id: 11, token: savedAccount.token });
        expect(store.getState().rmpSave).toMatchObject(savedSync);
    });

    it('keeps old test-server credentials separate from the original server session', () => {
        const suffix = '__sandbox_' + encodeURIComponent('https://sandbox.example.test/v1');
        rmgRuntime.storage.set(LocalStorageKey.ACCOUNT + suffix, JSON.stringify({ ...savedAccount, id: 111 }));
        rmgRuntime.storage.set(LocalStorageKey.RMP_SAVE + suffix, JSON.stringify({ baseUserId: 111 }));
        const store = initializeStores();
        expect(store.getState().account).toMatchObject({ isLoggedIn: true, id: 11, token: savedAccount.token });
        expect(store.getState().rmpSave).toMatchObject(savedSync);
    });
});
