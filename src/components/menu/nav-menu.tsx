import { ActionIcon, Alert, Anchor, Avatar, Divider, Title, Tooltip } from '@mantine/core';
import { RMEnvBadge, RMWindowHeader } from '@railmapgen/mantine-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import clsx from 'clsx';
import { ComponentProps, ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MdOutlineApps,
    MdOutlineBuild,
    MdOutlineHelpOutline,
    MdOutlineLink,
    MdOutlinePeopleOutline,
    MdOutlineSettings,
    MdWarning,
} from 'react-icons/md';
import { useSearchParams } from 'react-router-dom';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchSaveList } from '../../redux/account/account-slice';
import { isShowDevtools, MenuView, openTempApp, setMenuView, toggleMenu } from '../../redux/app/app-slice';
import useSmMediaQuery from '../hook/use-sm-media-query';
import ResolveConflictModal from '../modal/resolve-conflict-modal';
import AccountView from './account-view/account-view';
import AppsSection from './main-view/apps-section';
import LinksSection from './main-view/links-section';
import classes from './nav-menu.module.css';
import SettingsView from './settings-view';
import FontsSection from './support-view/fonts-section';
import SupportSection from './support-view/support-section';

type AsideButton = {
    key: MenuView;
    label: ReactNode;
    Icon: ReactNode;
    ActionIconProps?: ComponentProps<typeof ActionIcon>;
};

export default function NavMenu() {
    const {
        t,
        i18n: { language },
    } = useTranslation();

    const { isShowMenu, menuView, lastShowDevtools } = useRootSelector(state => state.app);
    const { isLoggedIn, name } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const smMediaQuery = useSmMediaQuery();
    const [searchParams] = useSearchParams();
    const prdUrl =
        (rmgRuntime.getInstance() === 'GitLab' ? 'https://railmapgen.gitlab.io/' : 'https://railmapgen.github.io/') +
        '?' +
        searchParams.toString();

    const lang =
        {
            'zh-Hans': 'zh-CN',
            'zh-Hant': 'zh-HK',
            ja: 'ja-JP',
            ko: 'ko-KR',
            en: 'en-US',
        }[language] || 'zh-CN';
    const cnyBlogUrl = `https://railmapgen.org/rmt-blog/${lang}/rmg-7th-newyear/`;

    useEffect(() => {
        if (!isLoggedIn) return;
        dispatch(fetchSaveList());
    }, [isLoggedIn]);

    const asideButtons: AsideButton[] = [
        { key: 'apps', label: t('Apps'), Icon: <MdOutlineApps size={22} /> },
        { key: 'links', label: t('Useful links'), Icon: <MdOutlineLink size={22} /> },
        {
            key: 'devtools',
            label: t('Devtools'),
            Icon: <MdOutlineBuild size={22} />,
            ActionIconProps: { style: { display: isShowDevtools(lastShowDevtools) ? 'inline-flex' : 'none' } },
        },
        {
            key: 'account',
            label: t('Account'),
            Icon: (
                <Avatar
                    variant="light"
                    name={isLoggedIn ? name : undefined}
                    // src="https://github.com/thekingofcity.png?size=100"
                    size="sm"
                    color="initials"
                />
            ),
            ActionIconProps: { mt: 'auto' },
        },
        {
            key: 'contributors',
            label: t('Contributors'),
            Icon: <MdOutlinePeopleOutline size={22} />,
            ActionIconProps: {
                onClick: () => {
                    dispatch(openTempApp('contributors'));
                    if (!smMediaQuery) {
                        dispatch(toggleMenu());
                        rmgRuntime.toggleNavMenu(false);
                    }
                },
            },
        },
        { key: 'support', label: t('Help & support'), Icon: <MdOutlineHelpOutline size={22} /> },
        { key: 'settings', label: t('Settings'), Icon: <MdOutlineSettings size={22} /> },
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

                <Alert color="red" icon={'🎇'} className={classes.alert}>
                    {t('happyChineseNewYear')}{' '}
                    <Anchor size="sm" href={cnyBlogUrl} target="_blank">
                        {t('happyChineseNewYearClickHere')}
                    </Anchor>
                </Alert>

                <div className={classes.body}>
                    <div className={classes.aside}>
                        {asideButtons.map(({ key, label, Icon, ActionIconProps }) => (
                            <Tooltip key={key} label={label} position="right" withArrow>
                                <ActionIcon
                                    variant={menuView === key ? 'light' : 'subtle'}
                                    color={menuView === key ? undefined : 'gray'}
                                    size="lg"
                                    onClick={() => dispatch(setMenuView(key))}
                                    {...ActionIconProps}
                                >
                                    {Icon}
                                </ActionIcon>
                            </Tooltip>
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

                        <ResolveConflictModal />
                    </div>
                </div>
            </div>
        </nav>
    );
}
