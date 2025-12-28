import classes from './workspace.module.css';
import { useMemo } from 'react';
import { FRAME_ID_PREFIX, WorkspaceTab } from '../../util/constants';
import clsx from 'clsx';
import { assetEnablement } from '../../util/asset-enablements';

interface AppContainerProps {
    tab: WorkspaceTab;
    isActive: boolean;
}

export default function AppContainer(props: AppContainerProps) {
    const { tab, isActive } = props;

    // This should not be changed after iframe has been rendered.
    const frameUrl = useMemo(() => tab.url ?? '/' + tab.app + '/', [tab.app]);

    return (
        <div
            className={clsx(
                classes['app-container'],
                isActive && classes.show,
                assetEnablement[tab.app] &&
                    !assetEnablement[tab.app].supportSafeAreaInset &&
                    classes['pb-safe-area-inset']
            )}
        >
            <iframe
                id={FRAME_ID_PREFIX + tab.id}
                src={frameUrl}
                loading="lazy"
                title={tab.app}
                data-persisted-url={tab.url}
                data-testid="app-container-iframe"
            />
        </div>
    );
}
