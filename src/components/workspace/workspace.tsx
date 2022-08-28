import { Box, CloseButton, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import React from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { closeApp, openApp } from '../../redux/app/app-slice';
import { componentList } from '../../util/constants';

export default function Workspace() {
    const dispatch = useRootDispatch();
    const { openedApps, activeApp } = useRootSelector(state => state.app);

    const tabIndex = activeApp ? openedApps.indexOf(activeApp) : -1;

    return (
        <Tabs variant="enclosed" index={tabIndex} display="flex" flex={1} flexDirection="column" overflow="hidden">
            <TabList whiteSpace="nowrap" overflowX="auto" overflowY="hidden">
                {/* FIXME: bottom border of selected tab is missing */}
                {openedApps.map(appId => (
                    <Tab key={appId} as={Box} onClick={() => dispatch(openApp(appId))}>
                        {componentList[appId]}
                        <CloseButton
                            size="sm"
                            onClick={e => {
                                e.stopPropagation();
                                dispatch(closeApp(appId));
                            }}
                            ml={1}
                        />
                    </Tab>
                ))}
            </TabList>

            <TabPanels sx={{ flex: 1, '&>div': { p: 0, w: '100%', h: '100%', '&>iframe': { w: '100%', h: '100%' } } }}>
                {openedApps.map(appId => (
                    <TabPanel key={appId}>
                        <iframe src={'/' + appId} title={componentList[appId]} />
                    </TabPanel>
                ))}
            </TabPanels>
        </Tabs>
    );
}
