import rmgRuntime from '@railmapgen/rmg-runtime';
import { act, cleanup, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../i18n/config';
import { createTestStore, render } from '../../test-utils';
import NavMenu from './nav-menu';

const languageLabel = 'Language/语言/語言/言語/언어';

describe('Language navigation', () => {
    afterEach(async () => {
        cleanup();
        window.localStorage.removeItem('rmg-runtime__language');
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

        await user.click(screen.getByRole('button', { name: languageLabel }));
        expect(screen.getByRole('heading', { name: languageLabel })).toBeInTheDocument();
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

        await user.click(screen.getByRole('button', { name: languageLabel }));
        await user.click(screen.getByRole('button', { name: '日本語' }));

        expect(rmgRuntime.getLanguage()).toBe('ja');
        expect(i18n.language).toBe('ja');
        expect(screen.getByRole('button', { name: '日本語', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'English', pressed: false })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: i18n.t('Settings') }));
        await user.click(screen.getByRole('button', { name: languageLabel }));
        expect(screen.getByRole('button', { name: '日本語', pressed: true })).toBeInTheDocument();

        await act(async () => {
            await i18n.changeLanguage('ko');
        });
        expect(screen.getByRole('heading', { name: languageLabel })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '한국어', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '日本語', pressed: false })).toBeInTheDocument();
    });
});
