import React, { useState } from 'react';
import { AppId, getAvailableApps } from '../../util/constants';
import { Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import AppItemButton from './app-item-button';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import AboutModal from '../modal/about-modal';

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

    const [aboutModalAppId, setAboutModalAppId] = useState<AppId>();

    const availableApps = getAvailableApps(rmgRuntime.getEnv());

    return (
        <Flex sx={style}>
            <Heading as="h5" size="sm">
                {t('Apps')}
            </Heading>
            <Flex>
                {availableApps.map(appId => (
                    <AppItemButton key={appId} appId={appId} onAboutOpen={() => setAboutModalAppId(appId)} />
                ))}
            </Flex>

            <AboutModal appId={aboutModalAppId} onClose={() => setAboutModalAppId(undefined)} />
        </Flex>
    );
}
