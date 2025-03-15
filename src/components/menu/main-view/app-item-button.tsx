import classes from './app-item-button.module.css';
import { closeApp, closeTab, openApp, openAppInNew, setActiveTab, toggleMenu } from '../../../redux/app/app-slice';
import { Events } from '../../../util/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { MdAdd, MdClose, MdInfoOutline, MdModeStandby, MdMoreHoriz } from 'react-icons/md';
import { assetEnablement } from '../../../util/asset-enablements';
import { ActionIcon, Badge, Menu, NavLink } from '@mantine/core';
import useSmMediaQuery from '../../hook/use-sm-media-query';

interface AppItemProps {
    appId: string;
    onAboutOpen: () => void;
}

export default function AppItemButton(props: AppItemProps) {
    const { appId, onAboutOpen } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const smMediaQuery = useSmMediaQuery();

    const { activeTab, openedTabs } = useRootSelector(state => state.app);

    const appDetail = assetEnablement[appId];
    const displayName = appDetail.name
        .split(' - ')
        .map(n => t(n))
        .join(' - ');

    const isAppRunning = openedTabs.some(tab => tab.app === appId);
    const isAppActive = !appDetail.allowMultiInstances && openedTabs.find(tab => tab.id === activeTab)?.app === appId;

    const handleOpenApp = (isOpenInNew: boolean) => {
        if (!isAppRunning) {
            // send event only when app was not previously opened
            rmgRuntime.event(Events.OPEN_APP, { appId, isOpenInNew });
        }

        if (isOpenInNew) {
            dispatch(openAppInNew(appId));
        } else {
            dispatch(openApp({ appId }));
        }

        if (!smMediaQuery) {
            dispatch(toggleMenu());
            rmgRuntime.toggleNavMenu(false);
        }
    };

    const handleSelectTab = (tabId: string) => {
        dispatch(setActiveTab(tabId));
        if (!smMediaQuery) {
            dispatch(toggleMenu());
            rmgRuntime.toggleNavMenu(false);
        }
    };

    const handleCloseTab = (tabId: string) => {
        dispatch(closeTab(tabId));
        rmgRuntime.event(Events.CLOSE_APP, { app: appId });
    };

    const handleCloseApp = (appId: string) => {
        dispatch(closeApp(appId));
        rmgRuntime.event(Events.CLOSE_APP, { app: appId });
    };

    return (
        <NavLink
            component="div"
            role="button"
            variant="filled"
            label={displayName}
            active={isAppActive}
            classNames={{ root: classes.button, label: classes.label }}
            leftSection={isAppRunning ? <MdModeStandby title={t('Running')} /> : undefined}
            rightSection={
                <>
                    {appDetail.allowMultiInstances && (
                        <ActionIcon
                            aria-label={t('New tab')}
                            title={t('New tab')}
                            variant="subtle"
                            color={isAppActive ? 'white' : 'gray'}
                            mr={4}
                            onClick={event => {
                                event.stopPropagation();
                                handleOpenApp(true);
                            }}
                        >
                            <MdAdd />
                        </ActionIcon>
                    )}
                    <Menu>
                        <Menu.Target>
                            <ActionIcon
                                variant="subtle"
                                color={isAppActive ? 'white' : 'gray'}
                                onClick={event => event.stopPropagation()}
                            >
                                <MdMoreHoriz />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {isAppRunning && (
                                <Menu.Item
                                    leftSection={<MdClose />}
                                    onClick={event => {
                                        event.stopPropagation();
                                        handleCloseApp(appId);
                                    }}
                                >
                                    {appDetail.allowMultiInstances ? t('Close all tabs') : t('Close app')}
                                </Menu.Item>
                            )}
                            <Menu.Item
                                leftSection={<MdInfoOutline />}
                                onClick={event => {
                                    event.stopPropagation();
                                    onAboutOpen();
                                }}
                            >
                                {t('About')}
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </>
            }
            disableRightSectionRotation
            opened
            onClick={() => handleOpenApp(false)}
        >
            {appDetail.allowMultiInstances &&
                openedTabs
                    .filter(tab => tab.app === appId)
                    .map((tab, i) => {
                        const isTabActive = tab.id === activeTab;
                        return (
                            <NavLink
                                key={tab.id}
                                component="div"
                                role="button"
                                variant="filled"
                                active={isTabActive}
                                label={
                                    <>
                                        <Badge color="lightgray" c="black" mr="xs" circle display="inline-flex">
                                            {i + 1}
                                        </Badge>
                                        {tab.title ?? t('Tab') + ' ' + (i + 1).toString() + ' - ' + displayName}
                                    </>
                                }
                                classNames={{ root: classes.button, label: classes['sub-label'] }}
                                rightSection={
                                    <ActionIcon
                                        variant="subtle"
                                        color={isTabActive ? 'white' : 'gray'}
                                        aria-label={t('Close tab')}
                                        title={t('Close tab')}
                                        onClick={event => {
                                            event.stopPropagation();
                                            handleCloseTab(tab.id);
                                        }}
                                    >
                                        <MdClose />
                                    </ActionIcon>
                                }
                                onClick={() => handleSelectTab(tab.id)}
                            />
                        );
                    })}
        </NavLink>
    );
}
