import rmgRuntime from '@railmapgen/rmg-runtime';
import { act, cleanup, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useMantineColorScheme } from '@mantine/core';
import i18n from '../../i18n/config';
import { createTestStore, render } from '../../test-utils';
import { installPreferences } from '../../util/preferences';
import AppRoot from '../app-root';
import LanguageView from './language-view';
import NavMenu from './nav-menu';

function ColorSchemeProbe() {
    const { colorScheme } = useMantineColorScheme();
    return <output data-testid="color-scheme">{colorScheme}</output>;
}

describe('Language navigation', () => {
    beforeEach(() => {
        window.localStorage.setItem('rmg-runtime__language', 'en');
    });

    afterEach(async () => {
        cleanup();
        window.localStorage.removeItem('rmg-runtime__language');
        window.localStorage.removeItem('rmt-language-preference');
        await i18n.changeLanguage('en');
    });

    it('Shows all five languages in a panel alongside Settings', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <NavMenu />
            </MemoryRouter>,
            { store: createTestStore() }
        );

        await user.click(screen.getByRole('button', { name: 'Settings' }));
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Language' }));
        expect(screen.getByRole('heading', { name: 'Language' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

        for (const name of ['English', '简体中文', '繁體中文', '日本語', '한국어']) {
            expect(screen.getByRole('button', { name })).toBeVisible();
        }
        expect(screen.getByRole('button', { name: 'English', pressed: true })).toBeInTheDocument();
    });

    it('Persists the selected language and keeps the selected row synchronized with i18n', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <NavMenu />
            </MemoryRouter>,
            { store: createTestStore() }
        );

        await user.click(screen.getByRole('button', { name: 'Language' }));
        await user.click(screen.getByRole('button', { name: '日本語' }));

        expect(rmgRuntime.getLanguage()).toBe('ja');
        expect(i18n.language).toBe('ja');
        expect(screen.getByRole('button', { name: '日本語', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'English', pressed: false })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: i18n.t('Settings') }));
        await user.click(screen.getByRole('button', { name: i18n.t('Language') }));
        expect(screen.getByRole('button', { name: '日本語', pressed: true })).toBeInTheDocument();

        await act(async () => {
            await i18n.changeLanguage('ko');
        });
        expect(screen.getByRole('button', { name: '한국어', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '日本語', pressed: false })).toBeInTheDocument();
    });
});

describe('System preference controls', () => {
    let release: (() => void) | undefined;
    const native = { appearance: 'dark', language: 'en', systemLanguage: 'ja', systemAppearance: 'light' };

    beforeEach(() => {
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
    });

    afterEach(async () => {
        cleanup();
        release?.();
        release = undefined;
        Reflect.deleteProperty(window, '__RMT_NATIVE_PREFERENCES__');
        window.localStorage.clear();
        vi.restoreAllMocks();
        await i18n.changeLanguage('en');
    });

    it('synchronizes the app theme and an open Appearance control with iOS Settings', async () => {
        const user = userEvent.setup();
        vi.spyOn(rmgRuntime, 'isAnalyticsQADone').mockReturnValue(true);
        Object.defineProperty(window, '__RMT_NATIVE_PREFERENCES__', { configurable: true, value: native });
        release = installPreferences();
        render(
            <>
                <AppRoot />
                <ColorSchemeProbe />
            </>
        );
        await user.click(screen.getByRole('button', { name: 'Settings' }));
        expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
        expect(screen.getByTestId('color-scheme')).toHaveTextContent('dark');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('dark');

        act(() => {
            window.dispatchEvent(
                new CustomEvent('rmt-native-preferences', { detail: { ...native, appearance: 'light' } })
            );
        });
        expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
        expect(screen.getByTestId('color-scheme')).toHaveTextContent('light');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('light');

        await user.click(screen.getByRole('radio', { name: 'Dark' }));
        expect(screen.getByTestId('color-scheme')).toHaveTextContent('dark');
    });

    it('keeps the System language row selected while iOS changes the resolved language', async () => {
        const user = userEvent.setup();
        release = installPreferences();
        render(<LanguageView />);
        expect(screen.getByRole('button', { name: 'System', pressed: true })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '日本語' }));
        expect(screen.getByRole('button', { name: '日本語', pressed: true })).toBeInTheDocument();
        act(() => {
            window.dispatchEvent(
                new CustomEvent('rmt-native-preferences', {
                    detail: { ...native, language: 'system', systemLanguage: 'ko' },
                })
            );
        });
        expect(i18n.language).toBe('ko');
        expect(screen.getByRole('button', { name: i18n.t('System'), pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '한국어', pressed: false })).toBeInTheDocument();
    });
});
