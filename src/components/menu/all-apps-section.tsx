import React from 'react';
import { AppId, getAppList } from '../../util/constants';
import { Flex } from '@chakra-ui/react';
import AppItemButton from './app-item-button';
import rmgRuntime from '@railmapgen/rmg-runtime';

export default function AllAppsSection() {
    const componentList = getAppList(rmgRuntime.getEnv());

    return (
        <Flex direction="column" w={240}>
            {Object.keys(componentList).map(appId => (
                <AppItemButton key={appId} appId={appId as AppId} />
            ))}
        </Flex>
    );
}
