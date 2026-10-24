import '@testing-library/jest-dom';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../src/i18n/config';
import AppRoot from './app-root';

describe('Desktop download page', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it.each([
        { date: '2026-10-24T12:00:00', tag: '20261001', version: '26.10.1' },
        { date: '2027-01-01T12:00:00', tag: '20270101', version: '27.1.1' },
    ])('Offers all published architectures for $tag', ({ date, tag, version }) => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(date));
        render(
            <I18nextProvider i18n={i18n}>
                <AppRoot />
            </I18nextProvider>
        );

        const base = `https://ghfast.top/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-${tag}/Rail.Map.Toolkit_${version}_`;
        const expectedLinks = [
            { name: 'Download Windows x64', file: 'x64-setup.exe' },
            { name: 'Download Windows ARM64', file: 'arm64-setup.exe' },
            { name: 'Download macOS Apple Silicon', file: 'aarch64.dmg' },
            { name: 'Download macOS Intel', file: 'x64.dmg' },
            { name: 'Download Linux x64 AppImage', file: 'amd64.AppImage' },
        ];
        expect(screen.getAllByRole('link')).toHaveLength(expectedLinks.length);
        for (const { name, file } of expectedLinks) {
            expect(screen.getByRole('link', { name })).toHaveAttribute('href', base + file);
        }

        for (const platform of ['Android', 'iOS']) {
            const row = within(screen.getByRole('region', { name: platform }));
            expect(row.getByText('Coming soon')).toBeVisible();
            expect(row.queryByRole('link')).not.toBeInTheDocument();
            expect(row.queryByRole('button')).not.toBeInTheDocument();
        }
        expect(screen.getByRole('img')).toHaveAccessibleName(
            'Rail Map Toolkit displaying a rail network map in Rail Map Painter'
        );
    });
});
