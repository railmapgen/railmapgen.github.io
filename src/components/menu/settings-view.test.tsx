import { render } from '../../test-utils';
import SettingsView from './settings-view';
import { userEvent } from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import rmgRuntime from '@railmapgen/rmg-runtime';

describe('SettingsView', () => {
    afterEach(() => {
        window.localStorage.removeItem('rmg-runtime__allowAnalytics');
    });

    it('Can handle cookies setting as expected', async () => {
        const user = userEvent.setup();
        render(<SettingsView />);

        // default - unchecked
        const cookiesCheckbox = screen.getByRole('switch', { name: 'Allow cookies to help improve our website' });
        expect(cookiesCheckbox).not.toBeChecked();

        // click to check
        await user.click(cookiesCheckbox);
        expect(cookiesCheckbox).toBeChecked();
        expect(rmgRuntime.isAllowAnalytics()).toBeTruthy();

        // click to uncheck
        await user.click(cookiesCheckbox);
        expect(cookiesCheckbox).not.toBeChecked();
        expect(cookiesCheckbox).toBeDisabled();
        expect(rmgRuntime.isAllowAnalytics()).toBeFalsy();
        expect(screen.getByRole('alert')).toHaveTextContent(/Refreshing is required/);
    });
});
