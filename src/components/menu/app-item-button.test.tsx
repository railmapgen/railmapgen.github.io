import React from 'react';
import { render } from '../../test-utils';
import AppItemButton from './app-item-button';
import rootReducer from '../../redux';
import { createMockRootStore } from '../../setupTests';
import { fireEvent, screen } from '@testing-library/react';

const realStore = rootReducer.getState();
const mockStore = createMockRootStore({ ...realStore });

const mockMatchMedia = jest.fn();

describe('AppItemButton', () => {
    afterEach(() => {
        mockStore.clearActions();
    });

    it('Can toggle off nav menu in small screen when open app', () => {
        window.matchMedia = mockMatchMedia.mockImplementation(media => ({
            media,
            matches: false,
            addEventListener: () => {},
            removeEventListener: () => {},
        }));
        render(<AppItemButton appId={'rmg'} />, { store: mockStore });

        fireEvent.click(screen.getByRole('button'));

        const actions = mockStore.getActions();
        expect(actions).toHaveLength(2);
        expect(actions).toContainEqual({ type: 'app/toggleMenu' });
    });

    it('Can keep nav menu open in large screen when open app', () => {
        window.matchMedia = mockMatchMedia.mockImplementation(media => ({
            media,
            matches: true,
            addEventListener: () => {},
            removeEventListener: () => {},
        }));
        render(<AppItemButton appId={'rmg'} />, { store: mockStore });

        fireEvent.click(screen.getByRole('button'));

        const actions = mockStore.getActions();
        expect(actions).toHaveLength(1);
        expect(actions).not.toContainEqual({ type: 'app/toggleMenu' });
    });
});
