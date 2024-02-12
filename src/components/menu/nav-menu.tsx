import { Alert, AlertDescription, AlertIcon, Flex, Heading, Link, SystemStyleObject } from '@chakra-ui/react';
import { RmgEnvBadge } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppsSection from './main-view/apps-section';
import NavMenuFooter from './nav-menu-footer';
import SettingsView from './settings-view';
import LinksSection from './main-view/links-section';
import { useRootSelector } from '../../redux';
import { isShowDevtools } from '../../redux/app/app-slice';
import SupportSection from './support-view/support-section';
import FontsSection from './support-view/fonts-section';

const NAV_MENU_WIDTH = 420;

const style: SystemStyleObject = {
    flexShrink: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    alignItems: 'flex-end',
    background: 'inherit',
    transition: '0.3s ease-in-out',
    maxW: 0,
    visibility: 'hidden',
    boxShadow: 'lg',
    zIndex: 100,

    '.show-menu &': {
        maxW: { base: '100%', md: NAV_MENU_WIDTH },
        w: { base: '100%', md: 'unset' },
        visibility: 'initial',
    },

    '& > div': {
        flexDirection: 'column',
        h: '100%',
        w: { base: '100vw', md: NAV_MENU_WIDTH },
        background: 'inherit',

        '& .nav-menu__header': {
            // header
            flex: 0,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 10,
            pl: 12,
        },

        '& .nav-menu__body': {
            // body
            flexDirection: 'column',
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            background: 'inherit',
        },
    },

    '& .chakra-alert': {
        flexGrow: 0,
        pl: 3,
        pr: 2,
        py: 2,

        '& a': {
            fontWeight: 'bold',
            textDecoration: 'underline',

            '&:hover, &:focus': {
                textDecoration: 'none',
            },
        },
    },
};

export default function NavMenu() {
    const { t } = useTranslation();

    const { menuView, lastShowDevtools } = useRootSelector(state => state.app);

    const [searchParams] = useSearchParams();
    const prdUrl =
        (rmgRuntime.getInstance() === 'GitLab' ? 'https://railmapgen.gitlab.io/' : 'https://railmapgen.github.io/') +
        '?' +
        searchParams.toString();

    return (
        <Flex sx={style}>
            <Flex>
                {/* menu-header */}
                <Flex className="nav-menu__header">
                    <Heading as="h4" size="md">
                        {t('Rail Map Toolkit')}
                    </Heading>
                    <RmgEnvBadge environment={rmgRuntime.getEnv()} version={rmgRuntime.getAppVersion()} />
                </Flex>

                {rmgRuntime.getEnv() !== 'PRD' && (
                    <Alert status="warning">
                        <AlertIcon />
                        <AlertDescription>
                            {t("You're currently viewing a testing environment.")}{' '}
                            <Link href={prdUrl} isExternal>
                                {t('Back to production environment')}
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                <Alert status="error">
                    <AlertDescription>
                        🎇{' '}
                        <Link href={'https://en.wikipedia.org/wiki/Chinese_New_Year'} isExternal>
                            {t('Happy Chinese New Year!')}
                        </Link>
                    </AlertDescription>
                </Alert>

                {/* menu-body */}
                <Flex className="nav-menu__body">
                    {menuView === 'main' ? (
                        <>
                            <AppsSection assetType="app" />
                            {isShowDevtools(lastShowDevtools) && <AppsSection assetType="devtool" />}
                            <LinksSection />
                        </>
                    ) : menuView === 'settings' ? (
                        <SettingsView />
                    ) : menuView === 'support' ? (
                        <>
                            <SupportSection />
                            <FontsSection />
                        </>
                    ) : (
                        <></>
                    )}
                </Flex>

                {/* menu-footer */}
                <NavMenuFooter />
            </Flex>
        </Flex>
    );
}
