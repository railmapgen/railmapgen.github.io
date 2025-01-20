import { useMemo } from 'react';
import { FRAME_ID_PREFIX, WorkspaceTab } from '../../util/constants';
import { Box } from '@chakra-ui/react';

interface AppContainerProps {
    tab: WorkspaceTab;
    isActive: boolean;
}

export default function AppContainer(props: AppContainerProps) {
    const { tab, isActive } = props;

    // This should not be changed after iframe has been rendered.
    const frameUrl = useMemo(() => tab.url ?? '/' + tab.app + '/', [tab.app]);

    return (
        <Box display={isActive ? 'block' : 'none'} flex={1}>
            <iframe
                id={FRAME_ID_PREFIX + tab.id}
                src={frameUrl}
                loading="lazy"
                title={tab.app}
                width="100%"
                height="100%"
                data-persisted-url={tab.url}
                data-testid="app-container-iframe"
            />
        </Box>
    );
}
