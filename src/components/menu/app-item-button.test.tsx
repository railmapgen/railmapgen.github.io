import { render } from '../../test-utils';
import AppItemButton from './app-item-button';
import rootReducer from '../../redux';
import { createMockRootStore } from '../../setupTests';
import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';

const realStore = rootReducer.getState();
const mockStore = createMockRootStore({ ...realStore });

const mockMatchMedia = vi.fn();
const mockCallbacks = {
    onAboutOpen: vi.fn(),
};

let testMessagesReceived: any[] = [];
const testChannel = new BroadcastChannel('rmg-runtime-channel');
testChannel.onmessage = ev => testMessagesReceived.push(ev.data);

describe('AppItemButton', () => {
    afterEach(() => {
        mockStore.clearActions();
        testMessagesReceived = [];
    });

    it('Can toggle off nav menu in small screen when open app', () => {
        window.matchMedia = mockMatchMedia.mockImplementation(media => ({
            media,
            matches: false,
            addListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
        }));
        render(<AppItemButton appId={'rmg'} {...mockCallbacks} />, { store: mockStore });

        fireEvent.click(screen.getByRole('button', { name: 'Rail Map Generator' }));

        const actions = mockStore.getActions();
        expect(actions).toHaveLength(2);
        expect(actions).toContainEqual({ type: 'app/toggleMenu' });

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

        const actions = mockStore.getActions();
        expect(actions).toHaveLength(1);
        expect(actions).not.toContainEqual({ type: 'app/toggleMenu' });

        expect(testMessagesReceived).toHaveLength(0);
    });
});
