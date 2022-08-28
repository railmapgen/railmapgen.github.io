import React from 'react';
import { AppId, componentList } from '../../util/constants';
import { Flex } from '@chakra-ui/react';
import AppItemButton from './app-item-button';

export default function AllAppsSection() {
    return (
        <Flex direction="column" w={240}>
            {Object.keys(componentList).map(appId => (
                <AppItemButton key={appId} appId={appId as AppId} />
            ))}
        </Flex>
    );
}
