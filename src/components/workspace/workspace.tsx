import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import React from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { openApp } from '../../redux/app/app-slice';

export default function Workspace() {
    const dispatch = useRootDispatch();
    const { openedApps, activeApp } = useRootSelector(state => state.app);

    const tabIndex = openedApps.findIndex(app => app.id === activeApp);

    const handleTabChange = (index: number) => {
        dispatch(openApp(openedApps[index].id));
    };

    return (
        <Tabs index={tabIndex} onChange={handleTabChange} display="flex" flex={1} flexDirection="column">
            <TabList>
                {openedApps.map(app => (
                    <Tab key={app.id}>{app.name}</Tab>
                ))}
            </TabList>

            <TabPanels sx={{ flex: 1, '&>div': { p: 0, w: '100%', h: '100%', '&>iframe': { w: '100%', h: '100%' } } }}>
                {openedApps.map(app => (
                    <TabPanel key={app.id}>
                        <iframe src={'/' + app.id} title={app.name} />
                    </TabPanel>
                ))}
            </TabPanels>
        </Tabs>
    );
}
