import rootReducer, { RootStore } from './index';
import { createTestStore } from '../test-utils';
import { LocalStorageKey, WorkspaceTab } from '../util/constants';
import { initActiveTab, initOpenedTabs } from './init';
import { showDevtools } from './app/app-slice';

const realStore = rootReducer.getState();

const mockOpenedTabs: WorkspaceTab[] = [
    { id: '01', app: 'rmg' },
    { id: '02', app: 'rmg-palette' },
    { id: '03', app: 'runtime-demo' },
    { id: '04', app: 'gitee-pages' },
];

describe('ReduxInit', () => {
    describe('ReduxInit - initOpenedTabs', () => {
        let mockStore: RootStore;

        beforeEach(() => {
            mockStore = createTestStore();
        });

        afterEach(() => {
            window.localStorage.clear();
        });

        it('Can filter out apps of invalid asset types', () => {
            window.localStorage.setItem(LocalStorageKey.OPENED_TABS, JSON.stringify(mockOpenedTabs));
            initOpenedTabs(mockStore);

            const openedApps = mockStore.getState().app.openedTabs.map(tab => tab.app);
            expect(openedApps).toHaveLength(2);
            expect(openedApps).toEqual(['rmg', 'rmg-palette']);
        });

        it('Can keep devtools if toggled on', () => {
            window.localStorage.setItem(LocalStorageKey.OPENED_TABS, JSON.stringify(mockOpenedTabs));
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
            window.localStorage.clear();
        });

        it('Can set active tab based on localStorage value as expected', () => {
            window.localStorage.setItem(LocalStorageKey.ACTIVE_TAB, '02');
            initActiveTab(mockStore);

            expect(mockStore.getState().app.activeTab).toBe('02');
        });

        it('Can set first tab if no activeTab defined in localStorage', () => {
            initActiveTab(mockStore);

            expect(mockStore.getState().app.activeTab).toBe('01');
        });
    });
});
