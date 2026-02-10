import classes from './app-root.module.css';
import { useEffect, useState } from 'react';
import Workspace from './workspace/workspace';
import { MdMenu } from 'react-icons/md';
import { toggleMenu } from '../redux/app/app-slice';
import { setActiveSubscriptions } from '../redux/account/account-slice';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../redux';
import NavMenu from './menu/nav-menu';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../util/constants';
import { checkCNY2026Period, CNY_CHECK_INTERVAL } from '../util/cny-2026';
import CookiesModal from './modal/cookies-modal';
import { BrowserRouter } from 'react-router-dom';
import MultiInstanceModal from './modal/multi-instance-modal';
import TerminationModal from './modal/termination-modal';
import { RMPage, RMWindow } from '@railmapgen/mantine-components';
import { ActionIcon } from '@mantine/core';
import Notifications from './notifications/notifications';
import { addNotification } from '../redux/notification/notification-slice';
import clsx from 'clsx';

export default function AppRoot() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const { isPrimary, isTerminated, isShowMenu } = useRootSelector(state => state.app);
    const isLoggedIn = useRootSelector(state => state.account.isLoggedIn);
    const activeSubscriptions = useRootSelector(state => state.account.activeSubscriptions);
    const [isCookiesModalOpen, setIsCookiesModalOpen] = useState(false);

    useEffect(() => {
        if (!rmgRuntime.isAnalyticsQADone()) {
            setIsCookiesModalOpen(true);
        }
    }, []);

    // CNY 2026 promotion: Show notification once per session
    const [cnyNotificationShown, setCnyNotificationShown] = useState(false);

    useEffect(() => {
        if (!cnyNotificationShown) {
            const timeoutId = setTimeout(() => {
                dispatch(
                    addNotification({
                        type: 'warning',
                        title: t('Happy Chinese New Year!'),
                        message: t('happyChineseNewYear'),
                        duration: 10000,
                    })
                );
                setCnyNotificationShown(true);
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [cnyNotificationShown, dispatch, t]);

    // CNY 2026 promotion: Check period and enable RMP_CLOUD for logged-in users
    useEffect(() => {
        let isActive = true;

        const checkAndApplyCNYPromotion = async () => {
            if (!isLoggedIn || !isActive) return;

            const isInPeriod = await checkCNY2026Period();
            if (isInPeriod && isActive) {
                if (!activeSubscriptions.RMP_CLOUD) {
                    dispatch(
                        setActiveSubscriptions({
                            ...activeSubscriptions,
                            RMP_CLOUD: '2026-02-23T15:59:59Z',
                        })
                    );
                }
            }
        };

        checkAndApplyCNYPromotion();

        const intervalId = setInterval(checkAndApplyCNYPromotion, CNY_CHECK_INTERVAL);

        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [isLoggedIn, activeSubscriptions, dispatch]);

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
