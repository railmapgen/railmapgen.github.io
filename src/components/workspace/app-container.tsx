import React from 'react';
import { WorkspaceTab } from '../../util/constants';
import { Box } from '@chakra-ui/react';

interface AppContainerProps {
    tab: WorkspaceTab;
    isActive: boolean;
}

export default function AppContainer(props: AppContainerProps) {
    const { tab, isActive } = props;

    return (
        <Box display={isActive ? 'block' : 'none'} flex={1}>
            <iframe
                id={'rmg-home:frame-' + tab.id}
                src={'/' + tab.app + '/'}
                loading="lazy"
                title={tab.app}
                width="100%"
                height="100%"
            />
        </Box>
    );
}
