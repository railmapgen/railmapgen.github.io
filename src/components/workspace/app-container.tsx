import React from 'react';
import { AppId } from '../../util/constants';
import { Box } from '@chakra-ui/react';

interface AppContainerProps {
    appId: AppId;
    isActive: boolean;
}

export default function AppContainer(props: AppContainerProps) {
    const { appId, isActive } = props;

    return (
        <Box display={isActive ? 'block' : 'none'} flex={1}>
            <iframe src={'/' + appId + '/'} loading="lazy" title={appId} width="100%" height="100%" />
        </Box>
    );
}
