import React from 'react';
import { getAvailableApps } from '../../util/constants';
import { Flex, SystemStyleObject } from '@chakra-ui/react';
import AppItemButton from './app-item-button';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useRootSelector } from '../../redux';

const style: SystemStyleObject = {
    flexShrink: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    alignItems: 'flex-end',
    transition: { base: 'unset', sm: '0.3s' },
    maxW: 0,
    visibility: 'hidden',

    '&.show-menu': {
        maxW: { base: '100%', sm: 240 },
        w: { base: '100%', sm: 'unset' },
        visibility: 'initial',
    },

    '& > div': {
        flexDirection: 'column',
        h: '100%',
        w: { base: '100%', sm: 240 },
    },
};

export default function AllAppsSection() {
    const isShowMenu = useRootSelector(state => state.app.isShowMenu);

    const availableApps = getAvailableApps(rmgRuntime.getEnv());

    return (
        <Flex as="section" className={isShowMenu ? 'show-menu' : ''} sx={style}>
            <Flex>
                {availableApps.map(appId => (
                    <AppItemButton key={appId} appId={appId} />
                ))}
            </Flex>
        </Flex>
    );
}
