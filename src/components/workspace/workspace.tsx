import { Box, CloseButton, SystemStyleObject, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import React from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { closeApp, openApp } from '../../redux/app/app-slice';
import { useTranslation } from 'react-i18next';
import { appEnablement } from '../../util/constants';

const style: SystemStyleObject = {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',

    '& .chakra-tabs__tablist': {
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        overflowY: 'hidden',
        ml: 10,
        transition: '0.3s ease-in-out',

        '.show-menu &': {
            ml: 0,
        },
    },

    '& .chakra-tabs__tab': {
        '& button': {
            ml: 1,
        },
    },

    '& .chakra-tabs__tab-panels': {
        flex: 1,
    },

    '& .chakra-tabs__tab-panel': {
        p: 0,
        w: '100%',
        h: '100%',
        '&>iframe': { w: '100%', h: '100%' },
    },
};

export default function Workspace() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { openedApps, activeApp } = useRootSelector(state => state.app);

    const tabIndex = activeApp ? openedApps.indexOf(activeApp) : -1;

    return (
        <Tabs as="section" variant="enclosed" index={tabIndex} sx={style}>
            <TabList>
                {openedApps.map(appId => (
                    <Tab key={appId} as={Box} onClick={() => dispatch(openApp(appId))}>
                        {t(appEnablement[appId].name)}
                        <CloseButton
                            size="sm"
                            onClick={e => {
                                e.stopPropagation();
                                dispatch(closeApp(appId));
                            }}
                        />
                    </Tab>
                ))}
            </TabList>

            <TabPanels>
                {openedApps.map(appId => (
                    <TabPanel key={appId}>
                        <iframe src={'/' + appId + '/'} title={appEnablement[appId].name} />
                    </TabPanel>
                ))}
            </TabPanels>
        </Tabs>
    );
}
