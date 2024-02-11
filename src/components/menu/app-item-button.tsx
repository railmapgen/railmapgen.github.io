import { closeApp, closeTab, openApp, openAppInNew, setActiveTab, toggleMenu } from '../../redux/app/app-slice';
import { appEnablement, Events } from '../../util/constants';
import {
    Badge,
    Box,
    Button,
    ButtonGroup,
    IconButton,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    SystemStyleObject,
    theme,
    useMediaQuery,
} from '@chakra-ui/react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { MdAdd, MdClose, MdInfoOutline, MdModeStandby, MdMoreHoriz } from 'react-icons/md';

const style: SystemStyleObject = {
    '& button:first-of-type': {
        w: '100%',
        overflow: 'hidden',
        justifyContent: 'flex-start',
        textOverflow: 'ellipsis',
        textAlign: 'start',

        '& span.chakra-button__icon': {
            ml: -1,
            color: 'orange.300',

            '[data-theme="dark"] &': {
                color: 'orange.200',
            },
        },
    },

    '&[aria-current="true"] > button': {
        bg: 'primary.50',
        _hover: { bg: 'primary.100' },

        '[data-theme="dark"] &': {
            bg: 'primary.700',
            _hover: { bg: 'primary.600' },
        },
    },
};

interface AppItemProps {
    appId: string;
    onAboutOpen: () => void;
}

export default function AppItemButton(props: AppItemProps) {
    const { appId, onAboutOpen } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const smMediaQuery = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);

    const { activeTab, openedTabs } = useRootSelector(state => state.app);

    const appDetail = appEnablement[appId];
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

        if (!smMediaQuery[0]) {
            dispatch(toggleMenu());
            rmgRuntime.toggleNavMenu(false);
        }
    };

    const handleSelectTab = (tabId: string) => {
        dispatch(setActiveTab(tabId));
        if (!smMediaQuery[0]) {
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
        <>
            <ButtonGroup
                variant={isAppActive ? 'solid' : 'ghost'}
                size="md"
                isAttached
                aria-current={isAppActive}
                sx={style}
            >
                <Button
                    onClick={() => handleOpenApp(false)}
                    leftIcon={isAppRunning ? <MdModeStandby title={t('Running')} /> : <Box w={4} />}
                >
                    {displayName}
                </Button>
                {appDetail.allowMultiInstances && (
                    <IconButton
                        aria-label={t('New tab')}
                        title={t('New tab')}
                        icon={<MdAdd />}
                        onClick={() => handleOpenApp(true)}
                    />
                )}
                <Menu>
                    <MenuButton as={IconButton} icon={<MdMoreHoriz />} aria-label={t('More')} title={t('More')} />
                    <MenuList>
                        {isAppRunning && (
                            <MenuItem icon={<MdClose />} onClick={() => handleCloseApp(appId)}>
                                {appDetail.allowMultiInstances ? t('Close all tabs') : t('Close app')}
                            </MenuItem>
                        )}
                        <MenuItem icon={<MdInfoOutline />} onClick={onAboutOpen}>
                            {t('About')}
                        </MenuItem>
                    </MenuList>
                </Menu>
            </ButtonGroup>

            {appDetail.allowMultiInstances &&
                openedTabs
                    .filter(tab => tab.app === appId)
                    .map((tab, i) => {
                        const isTabActive = tab.id === activeTab;
                        return (
                            <ButtonGroup
                                variant={isTabActive ? 'solid' : 'ghost'}
                                key={tab.id}
                                size="sm"
                                ml={8}
                                mr={1}
                                isAttached
                                aria-current={isTabActive}
                                sx={style}
                            >
                                <Button onClick={() => handleSelectTab(tab.id)}>
                                    <Badge mr={2}>{i + 1}</Badge>
                                    {t('Tab') + ' ' + (i + 1).toString() + ' - ' + displayName}
                                </Button>
                                <IconButton
                                    aria-label={t('Close tab')}
                                    title={t('Close tab')}
                                    icon={<MdClose />}
                                    onClick={() => handleCloseTab(tab.id)}
                                />
                            </ButtonGroup>
                        );
                    })}
        </>
    );
}
