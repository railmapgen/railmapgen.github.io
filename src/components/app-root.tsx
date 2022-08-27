import { Flex } from '@chakra-ui/react';
import React from 'react';
import WindowHeader from './window-header';
import Workspace from './workspace/workspace';
import { RmgPage, RmgWindow } from '@railmapgen/rmg-components';
import AllAppsSection from './menu/all-apps-section';

export default function AppRoot() {
    return (
        <RmgWindow>
            <WindowHeader />

            <RmgPage>
                <Flex flex={1}>
                    <AllAppsSection />

                    <Workspace />
                </Flex>
            </RmgPage>
        </RmgWindow>
    );
}
