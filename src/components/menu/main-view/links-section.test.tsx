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

    it.each([
        { id: 'tauri', name: 'Download desktop app', url: '/download/', isDesktop: true },
        { id: 'tauri', name: 'Download desktop app', url: '/download/', isDesktop: false },
        { id: 'privacy', name: 'Privacy', url: '/privacy/', isDesktop: true },
        { id: 'privacy', name: 'Privacy', url: '/privacy/', isDesktop: false },
    ])('Opens $name inside the workspace (desktop: $isDesktop)', async ({ id, name, url, isDesktop }) => {
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

        const link = screen.getByRole('button', { name });
        expect(link).not.toHaveAttribute('href');
        await user.click(link);

        expect(store.getState().app.openedTabs).toEqual([{ id, app: id, url }]);
        expect(store.getState().app.activeTab).toBe(id);
        expect(store.getState().app.isShowMenu).toBe(isDesktop);
        expect(link).toHaveAttribute('data-active', 'true');
        expect(eventSpy).toHaveBeenCalledWith(Events.OPEN_LINK, { id });

        await user.click(link);
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

        const miniMetroWeb = screen.getByRole('link', { name: 'Mini Metro Web' });
        expect(miniMetroWeb).toHaveAttribute('href', 'https://mini-metro-web.gitlab.io/');
        expect(miniMetroWeb).toHaveAttribute('target', '_blank');

        miniMetroWeb.addEventListener('click', event => event.preventDefault());
        await user.click(miniMetroWeb);
        expect(eventSpy).toHaveBeenCalledWith(Events.OPEN_LINK, { id: 'mini-metro-web' });
        expect(store.getState().app.openedTabs).toHaveLength(0);
        expect(store.getState().app.isShowMenu).toBe(true);
    });
});
