import { fireEvent, screen } from '@testing-library/react';
import { createTestStore, render } from '../../test-utils';
import Welcome from './welcome';

const mockMatchMedia = (isMobilePortrait: boolean) => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
        media: query,
        matches: query === '(max-width: 48em) and (orientation: portrait)' ? isMobilePortrait : false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
};

describe('Welcome', () => {
    const rmaDescription =
        'Generate station announcement content for a route. Good for turning station, transfer, and direction information into announcement copy that feels closer to a real ride experience.';

    beforeEach(() => {
        mockMatchMedia(false);
    });

    it('renders primary app cards', () => {
        render(<Welcome />, { store: createTestStore() });

        expect(screen.getByText('Rail Map Generator')).toBeInTheDocument();
        expect(screen.getByText('Rail Map Painter')).toBeInTheDocument();
        expect(screen.getByText('Rail Map Announcer')).toBeInTheDocument();
        expect(screen.getByText('Rail Sign Generator')).toBeInTheDocument();
    });

    it('opens selected app from app card', () => {
        const store = createTestStore();
        render(<Welcome />, { store });

        fireEvent.click(screen.getByRole('button', { name: 'Open Rail Map Announcer' }));

        expect(store.getState().app.openedTabs).toEqual([expect.objectContaining({ app: 'rma', url: '/rma/' })]);
    });

    it('expands mobile app details without opening the app', () => {
        mockMatchMedia(true);
        const store = createTestStore();
        render(<Welcome />, { store });

        expect(screen.queryByText(rmaDescription)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Expand Rail Map Announcer' }));

        expect(store.getState().app.openedTabs).toHaveLength(0);
        expect(screen.getByText(rmaDescription)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Open Rail Map Announcer' }));

        expect(store.getState().app.openedTabs).toEqual([expect.objectContaining({ app: 'rma', url: '/rma/' })]);
    });
});
