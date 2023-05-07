import React from 'react';
import { Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { RmgEnvBadge } from '@railmapgen/rmg-components';
import AppsSection from './apps-section';
import SettingsSection from './settings-section';
import NavMenuFooter from './nav-menu-footer';

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

        '& > div:nth-of-type(1)': {
            // header
            flex: 0,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 10,
            pl: 12,
        },

        '& > div:nth-of-type(2)': {
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
};

export default function NavMenu() {
    const { t } = useTranslation();

    return (
        <Flex as="section" sx={style}>
            <Flex>
                {/* menu-header */}
                <Flex>
                    <Heading as="h4" size="md">
                        {t('Rail Map Toolkit')}
                    </Heading>
                    <RmgEnvBadge environment={rmgRuntime.getEnv()} version={rmgRuntime.getAppVersion()} />
                </Flex>

                {/* menu-body */}
                <Flex>
                    <AppsSection />
                    <SettingsSection />
                </Flex>

                {/* menu-footer */}
                <NavMenuFooter />
            </Flex>
        </Flex>
    );
}
