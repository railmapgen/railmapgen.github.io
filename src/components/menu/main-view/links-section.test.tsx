import { cleanup, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { createTestStore, render } from '../../../test-utils';
import { Events } from '../../../util/constants';
import LinksSection from './links-section';

describe('Useful links', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it.each([true, false])('Opens the download page inside the workspace (desktop: %s)', async isDesktop => {
        vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
            media: query,
            matches: isDesktop,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        const store = createTestStore();
        const user = userEvent.setup();
        const eventSpy = vi.spyOn(rmgRuntime, 'event');
        const toggleNavMenuSpy = vi.spyOn(rmgRuntime, 'toggleNavMenu');
        render(<LinksSection />, { store });

        const download = screen.getByRole('button', { name: 'Download desktop app' });
        expect(download).not.toHaveAttribute('href');
        await user.click(download);

        expect(store.getState().app.openedTabs).toEqual([{ id: 'tauri', app: 'tauri', url: '/download/' }]);
        expect(store.getState().app.activeTab).toBe('tauri');
        expect(store.getState().app.isShowMenu).toBe(isDesktop);
        expect(download).toHaveAttribute('data-active', 'true');
        expect(eventSpy).toHaveBeenCalledWith(Events.OPEN_LINK, { id: 'tauri' });

        await user.click(download);
        expect(store.getState().app.openedTabs).toHaveLength(1);
        expect(store.getState().app.isShowMenu).toBe(isDesktop);
        if (!isDesktop) {
            expect(toggleNavMenuSpy).toHaveBeenCalledExactlyOnceWith(false);
        } else {
            expect(toggleNavMenuSpy).not.toHaveBeenCalled();
        }
    });

    it('Keeps external useful links opening in a new tab', async () => {
        const store = createTestStore();
        const user = userEvent.setup();
        const eventSpy = vi.spyOn(rmgRuntime, 'event');
        render(<LinksSection />, { store });

        expect(screen.getByRole('link', { name: 'Tutorial' })).toHaveAttribute(
            'href',
            'https://rmttutorial.wordpress.com'
        );
        expect(screen.getByRole('link', { name: 'Tutorial' })).toHaveAttribute('target', '_blank');

        const tutorial = screen.getByRole('link', { name: 'Tutorial' });
        tutorial.addEventListener('click', event => event.preventDefault());
        await user.click(tutorial);
        expect(eventSpy).toHaveBeenCalledWith(Events.OPEN_LINK, { id: 'tutorial' });
        expect(store.getState().app.openedTabs).toHaveLength(0);
        expect(store.getState().app.isShowMenu).toBe(true);
    });
});
