import { IconButton } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import Workspace from './workspace/workspace';
import { RmgPage, RmgWindow } from '@railmapgen/rmg-components';
import { MdMenu } from 'react-icons/md';
import { toggleMenu } from '../redux/app/app-slice';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../redux';
import NavMenu from './menu/nav-menu';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../util/constants';
import CookiesModal from './modal/cookies-modal';

export default function AppRoot() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const isShowMenu = useRootSelector(state => state.app.isShowMenu);
    const [isCookiesModalOpen, setIsCookiesModalOpen] = useState(false);

    useEffect(() => {
        if (!rmgRuntime.isAnalyticsQADone()) {
            setIsCookiesModalOpen(true);
        }
    }, []);

    const handleToggle = () => {
        dispatch(toggleMenu());
        rmgRuntime.event(Events.TOGGLE_NAV_MENU, {});
    };

    return (
        <RmgWindow className={isShowMenu ? 'show-menu' : ''}>
            <IconButton
                variant="ghost"
                size="md"
                aria-label={t('Toggle menu')}
                title={t('Toggle menu')}
                icon={<MdMenu />}
                position="absolute"
                zIndex={110}
                onClick={handleToggle}
            />
            <RmgPage sx={{ flexDirection: 'row' }}>
                <NavMenu onCookiesModalOpen={() => setIsCookiesModalOpen(true)} />
                <Workspace />
            </RmgPage>

            <CookiesModal isOpen={isCookiesModalOpen} onClose={() => setIsCookiesModalOpen(false)} />
        </RmgWindow>
    );
}
