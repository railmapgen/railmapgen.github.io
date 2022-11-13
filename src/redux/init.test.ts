import rootReducer from './index';
import { createMockRootStore } from '../setupTests';
import { LocalStorageKey, WorkspaceTab } from '../util/constants';
import { initActiveTab, initOpenedTabs } from './init';

const realStore = rootReducer.getState();

const mockOpenedTabs: WorkspaceTab[] = [
    { id: '01', app: 'rmg' },
    { id: '02', app: 'rmg-palette' },
];

describe('ReduxInit', () => {
    describe('ReduxInit - initOpenedTabs', () => {
        const mockStore = createMockRootStore({ ...realStore });

        afterEach(() => {
            window.localStorage.clear();
            mockStore.clearActions();
        });

        it('Can parse openedTabs from localStorage as expected', () => {
            window.localStorage.setItem(LocalStorageKey.OPENED_TABS, JSON.stringify(mockOpenedTabs));
            initOpenedTabs(mockStore);

            const actions = mockStore.getActions();
            expect(actions).toHaveLength(1);
            expect(actions).toContainEqual(expect.objectContaining({ type: 'app/setOpenedTabs' }));
            expect(actions[0].payload).toHaveLength(2);
        });

        it('Can parse legacy openedApps from localStorage as expected', () => {
            window.localStorage.setItem('rmg-home__openedApps', JSON.stringify(['rmg', 'rmg-palette']));
            initOpenedTabs(mockStore);

            const actions = mockStore.getActions();
            expect(actions).toHaveLength(1);
            expect(actions).toContainEqual(expect.objectContaining({ type: 'app/setOpenedTabs' }));
            expect(actions[0].payload).toHaveLength(2);
        });
    });

    describe('ReduxInit - initActiveTab', () => {
        const mockStore = createMockRootStore({ ...realStore, app: { ...realStore.app, openedTabs: mockOpenedTabs } });

        afterEach(() => {
            mockStore.clearActions();
            window.localStorage.clear();
        });

        it('Can set active tab based on localStorage value as expected', () => {
            window.localStorage.setItem(LocalStorageKey.ACTIVE_TAB, '02');
            initActiveTab(mockStore);

            const actions = mockStore.getActions();
            expect(actions).toHaveLength(1);
            expect(actions).toContainEqual({ type: 'app/setActiveTab', payload: '02' });
        });

        it('Can set first tab if no activeTab defined in localStorage', () => {
            initActiveTab(mockStore);

            const actions = mockStore.getActions();
            expect(actions).toHaveLength(1);
            expect(actions).toContainEqual({ type: 'app/setActiveTab', payload: '01' });
        });
    });
});
