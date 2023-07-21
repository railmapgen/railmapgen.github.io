import React from 'react';
import { Alert, AlertDescription, AlertIcon, Flex, Heading, Link, SystemStyleObject } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import rmgRuntime, { RmgInstance } from '@railmapgen/rmg-runtime';
import { RmgEnvBadge } from '@railmapgen/rmg-components';
import AppsSection from './apps-section';
import SettingsSection from './settings-section';
import NavMenuFooter from './nav-menu-footer';
import { useSearchParams } from 'react-router-dom';

const style: SystemStyleObject = {
    flexShrink: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    alignItems: 'flex-end',
    transition: '0.3s ease-in-out',
    maxW: 0,
    visibility: 'hidden',
    boxShadow: 'lg',
    zIndex: 100,

    '.show-menu &': {
        maxW: { base: '100%', sm: 360 },
        w: { base: '100%', sm: 'unset' },
        visibility: 'initial',
    },

    '& > div': {
        flexDirection: 'column',
        h: '100%',
        w: { base: '100vw', sm: 360 },

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
            overflow: 'hidden',

            '& > div:first-of-type': {
                flex: 1,
                overflowY: 'auto',
            },
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

    const [searchParams] = useSearchParams();
    const prdUrl =
        (rmgRuntime.getInstance() === RmgInstance.GITLAB
            ? 'https://railmapgen.gitlab.io/'
            : 'https://railmapgen.github.io/') +
        '?' +
        searchParams.toString();

    return (
        <Flex as="section" sx={style}>
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

                {/* menu-body */}
                <Flex className="nav-menu__body">
                    <AppsSection />
                    <SettingsSection />
                </Flex>

                {/* menu-footer */}
                <NavMenuFooter />
            </Flex>
        </Flex>
    );
}
