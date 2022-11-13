import React, { useEffect, useState } from 'react';
import { openApp, openAppInNew, toggleMenu } from '../../redux/app/app-slice';
import { appEnablement, AppId, Events } from '../../util/constants';
import {
    Badge,
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
import { useRootDispatch } from '../../redux';
import { getVersion } from '../../service/info-service';
import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { MdInfoOutline, MdMoreHoriz, MdOpenInNew } from 'react-icons/md';

const style: SystemStyleObject = {
    w: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-start',

    '& span:first-of-type': {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        textAlign: 'start',
    },

    // '& span:last-of-type': {
    //     ml: 'auto',
    // },
};

interface AppItemProps {
    appId: AppId;
}

export default function AppItemButton(props: AppItemProps) {
    const { appId } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const smMediaQuery = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);

    const [version, setVersion] = useState('unknown');

    useEffect(() => {
        getVersion(appId).then(data => setVersion(data));
    }, [appId]);

    const handleOpenApp = (isOpenInNew: boolean) => {
        if (isOpenInNew) {
            dispatch(openAppInNew(appId));
        } else {
            dispatch(openApp(appId));
        }

        if (!smMediaQuery[0]) {
            dispatch(toggleMenu());
        }

        rmgRuntime.event(Events.OPEN_APP, { appId, isOpenInNew });
    };

    return (
        <ButtonGroup variant="ghost" size="md" isAttached>
            <Button onClick={() => handleOpenApp(false)} title={t(appEnablement[appId].name)} sx={style}>
                <span>{t(appEnablement[appId].name)}</span>
                {/*<Badge>{version}</Badge>*/}
            </Button>
            <Menu>
                <MenuButton as={IconButton} icon={<MdMoreHoriz />} aria-label={t('More')} title={t('More')} />
                <MenuList>
                    {appEnablement[appId].allowMultiInstances && (
                        <MenuItem icon={<MdOpenInNew />} onClick={() => handleOpenApp(true)}>
                            {t('Open in new Workspace')}
                        </MenuItem>
                    )}
                    <MenuItem icon={<MdInfoOutline />}>{t('About') + ' ' + t(appEnablement[appId].name)}</MenuItem>
                </MenuList>
            </Menu>
        </ButtonGroup>
    );
}
