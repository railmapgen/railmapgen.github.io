import React from 'react';
import { Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { RmgEnvBadge } from '@railmapgen/rmg-components';
import AppsSection from './apps-section';
import SettingsSection from './settings-section';

const style: SystemStyleObject = {
    flexShrink: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    alignItems: 'flex-end',
    transition: '0.3s ease-in-out',
    maxW: 0,
    visibility: 'hidden',

    '.show-menu &': {
        maxW: { base: '100%', sm: 240 },
        w: { base: '100%', sm: 'unset' },
        visibility: 'initial',
    },

    '& > div': {
        flexDirection: 'column',
        h: '100%',
        w: { base: '100vw', sm: 240 },

        '& > div:first-of-type': {
            flex: 0,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 10,
            pl: 12,
        },
    },
};

export default function NavMenu() {
    const { t } = useTranslation();

    return (
        <Flex as="section" sx={style}>
            <Flex>
                <Flex>
                    <Heading as="h4" size="md">
                        {t('RMG Home')}
                    </Heading>
                    <RmgEnvBadge environment={rmgRuntime.getEnv()} version={rmgRuntime.getAppVersion()} />
                </Flex>

                <AppsSection />
                <SettingsSection />
            </Flex>
        </Flex>
    );
}
