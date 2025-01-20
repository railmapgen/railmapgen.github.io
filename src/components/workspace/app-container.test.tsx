import { render } from '../../test-utils';
import AppContainer from './app-container';
import { screen } from '@testing-library/react';

describe('AppContainer', () => {
    it('#163 Can persist URL update but not changing iframe src to prevent reload', () => {
        const tab = { app: 'test', id: 'test', url: '/test/' };
        const { rerender } = render(<AppContainer tab={tab} isActive={true} />);

        const iframe = screen.getByTestId('app-container-iframe');
        expect(iframe).toHaveAttribute('src', '/test/');
        expect(iframe).toHaveAttribute('data-persisted-url', '/test/');

        rerender(<AppContainer tab={{ ...tab, url: '/test/?x=1' }} isActive={true} />);
        expect(iframe).toHaveAttribute('src', '/test/');
        expect(iframe).toHaveAttribute('data-persisted-url', '/test/?x=1');
    });
});
