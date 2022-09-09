import React from 'react';
import { getAvailableApps } from '../../util/constants';
import { Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import AppItemButton from './app-item-button';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';

const style: SystemStyleObject = {
    flexDirection: 'column',

    '& h5': {
        mx: 1,
        my: 2,
    },

    '& > div': {
        flexDirection: 'column',
    },
};

export default function AppsSection() {
    const { t } = useTranslation();
    const availableApps = getAvailableApps(rmgRuntime.getEnv());

    return (
        <Flex sx={style}>
            <Heading as="h5" size="sm">
                {t('Apps')}
            </Heading>
            <Flex>
                {availableApps.map(appId => (
                    <AppItemButton key={appId} appId={appId} />
                ))}
            </Flex>
        </Flex>
    );
}
