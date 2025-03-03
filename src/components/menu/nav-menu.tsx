import classes from './nav-menu.module.css';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useRootDispatch, useRootSelector } from '../../redux';
import { isShowDevtools, MenuView, setMenuView } from '../../redux/app/app-slice';
import ResolveConflictModal from '../modal/resolve-conflict-modal';
import AccountView from './account-view/account-view';
import AppsSection from './main-view/apps-section';
import LinksSection from './main-view/links-section';
import SettingsView from './settings-view';
import FontsSection from './support-view/fonts-section';
import SupportSection from './support-view/support-section';
import { RMEnvBadge, RMWindowHeader } from '@railmapgen/mantine-components';
import { ActionIcon, Alert, Anchor, Divider, Title } from '@mantine/core';
import {
    MdOutlineAccountCircle,
    MdOutlineApps,
    MdOutlineBuild,
    MdOutlineHelpOutline,
    MdOutlineLink,
    MdOutlinePeopleOutline,
    MdOutlineSettings,
    MdWarning,
} from 'react-icons/md';
import clsx from 'clsx';
import { IconType } from 'react-icons';
import ContributorModal from '../modal/contributor-modal/contributor-modal';
import { ComponentProps, useState } from 'react';

type AsideButton = {
    key: MenuView;
    Icon: IconType;
    ActionIconProps?: ComponentProps<typeof ActionIcon>;
    IconProps?: IconType;
};

export default function NavMenu() {
    const { t } = useTranslation();

    const { isShowMenu, menuView, lastShowDevtools } = useRootSelector(state => state.app);
    const dispatch = useRootDispatch();

    const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);

    const [searchParams] = useSearchParams();
    const prdUrl =
        (rmgRuntime.getInstance() === 'GitLab' ? 'https://railmapgen.gitlab.io/' : 'https://railmapgen.github.io/') +
        '?' +
        searchParams.toString();

    const asideButtons: AsideButton[] = [
        { key: 'apps', Icon: MdOutlineApps },
        { key: 'links', Icon: MdOutlineLink },
        {
            key: 'devtools',
            Icon: MdOutlineBuild,
            ActionIconProps: { style: { display: isShowDevtools(lastShowDevtools) ? 'inline-flex' : 'none' } },
        },
        { key: 'account', Icon: MdOutlineAccountCircle, ActionIconProps: { mt: 'auto' } },
        {
            key: 'contributors',
            Icon: MdOutlinePeopleOutline,
            ActionIconProps: { onClick: () => setIsContributorModalOpen(true) },
        },
        { key: 'support', Icon: MdOutlineHelpOutline },
        { key: 'settings', Icon: MdOutlineSettings },
    ];

    return (
        <nav className={clsx(classes.root, isShowMenu && classes['show-menu'])}>
            <div className={classes.wrapper}>
                <RMWindowHeader className={classes.header}>
                    <Title>{t('Rail Map Toolkit')}</Title>
                    <RMEnvBadge env={rmgRuntime.getEnv()} ver={rmgRuntime.getAppVersion()} />
                </RMWindowHeader>

                <Divider />

                {rmgRuntime.getEnv() !== 'PRD' && (
                    <Alert color="yellow" icon={<MdWarning />} className={classes.alert}>
                        {t("You're currently viewing a testing environment.")}{' '}
                        <Anchor size="sm" href={prdUrl} target="_blank">
                            {t('Back to production environment')}
                        </Anchor>
                    </Alert>
                )}

                <div className={classes.body}>
                    <div className={classes.aside}>
                        {asideButtons.map(({ key, Icon, ActionIconProps, IconProps }) => (
                            <ActionIcon
                                key={key}
                                variant={menuView === key ? 'light' : 'subtle'}
                                color={menuView === key ? undefined : 'gray'}
                                size="lg"
                                onClick={() => dispatch(setMenuView(key))}
                                {...ActionIconProps}
                            >
                                <Icon size={22} {...IconProps} />
                            </ActionIcon>
                        ))}
                    </div>
                    <Divider orientation="vertical" />
                    <div className={classes.main}>
                        {/*{menuView === 'main' && <AccountStatus />}*/}

                        {/* menu-body */}
                        {menuView === 'apps' ? (
                            <AppsSection assetType="app" />
                        ) : menuView === 'links' ? (
                            <LinksSection />
                        ) : menuView === 'devtools' ? (
                            <AppsSection assetType="devtool" />
                        ) : menuView === 'settings' ? (
                            <SettingsView />
                        ) : menuView === 'support' ? (
                            <>
                                <SupportSection />
                                <FontsSection />
                            </>
                        ) : menuView === 'account' ? (
                            <AccountView />
                        ) : (
                            <></>
                        )}

                        {/* menu-footer */}

                        <ResolveConflictModal />
                    </div>
                </div>
            </div>

            <ContributorModal opened={isContributorModalOpen} onClose={() => setIsContributorModalOpen(false)} />
        </nav>
    );
}
