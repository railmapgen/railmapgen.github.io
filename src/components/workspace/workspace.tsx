import { Box, CloseButton, SystemStyleObject, Tab, TabList, Tabs } from '@chakra-ui/react';
import React from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { closeTab, setActiveTab } from '../../redux/app/app-slice';
import { useTranslation } from 'react-i18next';
import { appEnablement, AppId, Events } from '../../util/constants';
import Welcome from './welcome';
import AppContainer from './app-container';
import rmgRuntime from '@railmapgen/rmg-runtime';

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
    const { openedTabs, activeTab } = useRootSelector(state => state.app);

    const tabIndex = activeTab ? openedTabs.findIndex(tab => tab.id === activeTab) : -1;

    const handleCloseTab = (event: React.MouseEvent<HTMLButtonElement>, tabId: string, app: AppId) => {
        event.stopPropagation();
        dispatch(closeTab(tabId));
        rmgRuntime.event(Events.CLOSE_APP, { app });
    };

    if (openedTabs.length === 0) {
        return <Welcome />;
    }

    return (
        <Tabs as="section" variant="enclosed" colorScheme="primary" index={tabIndex} sx={style}>
            <TabList>
                {openedTabs.map(({ id, app }) => (
                    <Tab key={id} as={Box} onClick={() => dispatch(setActiveTab(id))} cursor="pointer">
                        {t(appEnablement[app].name)}
                        <CloseButton size="sm" onClick={e => handleCloseTab(e, id, app)} title={t('Close')} />
                    </Tab>
                ))}
            </TabList>

            {openedTabs.map(tab => (
                <AppContainer key={tab.id} tab={tab} isActive={activeTab === tab.id} />
            ))}
        </Tabs>
    );
}
