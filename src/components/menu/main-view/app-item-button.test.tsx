import { createTestStore, render } from '../../../test-utils';
import AppItemButton from './app-item-button';
import { RootStore } from '../../../redux';
import { fireEvent, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

let mockStore: RootStore;

const mockMatchMedia = vi.fn();
const mockCallbacks = {
    onAboutOpen: vi.fn(),
};

let testMessagesReceived: unknown[] = [];
let testChannel: BroadcastChannel;

describe('AppItemButton', () => {
    beforeAll(() => {
        testChannel = new BroadcastChannel('rmg-runtime-channel');
        testChannel.onmessage = ev => testMessagesReceived.push(ev.data);
    });

    beforeEach(async () => {
        mockStore = createTestStore();
    });

    afterEach(() => {
        testMessagesReceived = [];
    });

    afterAll(() => {
        testChannel.close();
    });

    it('Can toggle off nav menu in small screen when open app', async () => {
        window.matchMedia = mockMatchMedia.mockImplementation(media => ({
            media,
            matches: false,
            addListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
        }));

        const user = userEvent.setup();
        render(<AppItemButton appId={'rmg'} {...mockCallbacks} />, { store: mockStore });

        await user.click(screen.getByRole('button', { name: 'Rail Map Generator' }));

        expect(mockStore.getState().app.isShowMenu).toBeFalsy();

        expect(testMessagesReceived).toHaveLength(1);
        expect(testMessagesReceived).toContainEqual(expect.objectContaining({ event: 'TOGGLE_NAV_MENU', data: false }));
    });

    it('Can keep nav menu open in large screen when open app', () => {
        window.matchMedia = mockMatchMedia.mockImplementation(media => ({
            media,
            matches: true,
            addListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
        }));
        render(<AppItemButton appId={'rmg'} {...mockCallbacks} />, { store: mockStore });

        fireEvent.click(screen.getByRole('button', { name: 'Rail Map Generator' }));

        expect(mockStore.getState().app.isShowMenu).toBeTruthy();

        expect(testMessagesReceived).toHaveLength(0);
    });
});
