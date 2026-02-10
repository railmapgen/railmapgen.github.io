import classes from './app-root.module.css';
import { useEffect, useState } from 'react';
import Workspace from './workspace/workspace';
import { MdMenu } from 'react-icons/md';
import { toggleMenu } from '../redux/app/app-slice';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../redux';
import NavMenu from './menu/nav-menu';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../util/constants';
import CookiesModal from './modal/cookies-modal';
import { BrowserRouter } from 'react-router-dom';
import MultiInstanceModal from './modal/multi-instance-modal';
import TerminationModal from './modal/termination-modal';
import { RMPage, RMWindow } from '@railmapgen/mantine-components';
import { ActionIcon } from '@mantine/core';
import Notifications from './notifications/notifications';
import clsx from 'clsx';

export default function AppRoot() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const { isPrimary, isTerminated, isShowMenu } = useRootSelector(state => state.app);
    const [isCookiesModalOpen, setIsCookiesModalOpen] = useState(false);

    useEffect(() => {
        if (!rmgRuntime.isAnalyticsQADone()) {
            setIsCookiesModalOpen(true);
        }
    }, []);

    const handleToggle = () => {
        rmgRuntime.toggleNavMenu(!isShowMenu);
        dispatch(toggleMenu());
        rmgRuntime.event(Events.TOGGLE_NAV_MENU);
    };

    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <RMWindow className={clsx(classes.root, isShowMenu && 'show-menu')}>
                <ActionIcon
                    className={classes.burger}
                    variant={isShowMenu ? 'subtle' : 'filled'}
                    color={isShowMenu ? 'gray' : undefined}
                    aria-label={t('Toggle menu')}
                    title={t('Toggle menu')}
                    onClick={handleToggle}
                >
                    <MdMenu />
                </ActionIcon>
                <RMPage direction="row">
                    <NavMenu />
                    <Workspace alwaysShowWelcome={isTerminated || isPrimary === false} />
                </RMPage>

                <Notifications />
                {isTerminated && <TerminationModal />}
                {isPrimary === false && <MultiInstanceModal />}
                <CookiesModal opened={isCookiesModalOpen} onClose={() => setIsCookiesModalOpen(false)} />
            </RMWindow>
        </BrowserRouter>
    );
}
