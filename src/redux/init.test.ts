import rootReducer, { RootStore } from './index';
import { createTestStore } from '../test-utils';
import { LocalStorageKey, WorkspaceTab } from '../util/constants';
import { initActiveTab, initOpenedTabs, openSearchedApp } from './init';
import { showDevtools } from './app/app-slice';
import rmgRuntime from '@railmapgen/rmg-runtime';

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
});
