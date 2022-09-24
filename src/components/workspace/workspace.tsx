import { Box, CloseButton, SystemStyleObject, Tab, TabList, Tabs } from '@chakra-ui/react';
import React from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { closeApp, openApp } from '../../redux/app/app-slice';
import { useTranslation } from 'react-i18next';
import { appEnablement } from '../../util/constants';
import Welcome from './welcome';
import AppContainer from './app-container';

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
};

export default function Workspace() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { openedApps, activeApp } = useRootSelector(state => state.app);

    const tabIndex = activeApp ? openedApps.indexOf(activeApp) : -1;

    if (openedApps.length === 0) {
        return <Welcome />;
    }

    return (
        <Tabs as="section" variant="enclosed" colorScheme="primary" index={tabIndex} sx={style}>
            <TabList>
                {openedApps.map(appId => (
                    <Tab key={appId} as={Box} onClick={() => dispatch(openApp(appId))} cursor="pointer">
                        {t(appEnablement[appId].name)}
                        <CloseButton
                            size="sm"
                            onClick={e => {
                                e.stopPropagation();
                                dispatch(closeApp(appId));
                            }}
                            title={t('Close')}
                        />
                    </Tab>
                ))}
            </TabList>

            {openedApps.map(appId => (
                <AppContainer key={appId} appId={appId} isActive={activeApp === appId} />
            ))}
        </Tabs>
    );
}
