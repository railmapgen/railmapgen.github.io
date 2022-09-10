import { Divider, Flex, Icon, Link, Text, useColorModeValue } from '@chakra-ui/react';
import rmgRuntime, { RmgInstance } from '@railmapgen/rmg-runtime';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { getMirrorUrl, mirrorName } from '../../util/constants';

const INSTANCE = rmgRuntime.getInstance();
const SWITCH_INSTANCE = INSTANCE === RmgInstance.GITHUB ? RmgInstance.GITLAB : RmgInstance.GITHUB;

export default function NavMenuFooter() {
    const { t } = useTranslation();
    const linkColour = useColorModeValue('primary.500', 'primary.300');

    const mirror = mirrorName[INSTANCE];

    return (
        <Flex direction="column">
            <Divider />
            <Text fontSize="xs" textAlign="center" width="100%">
                <Trans i18nKey="NavMenuFooter.currentMirror" mirror={mirror}>
                    You're on {{ mirror }} mirror
                </Trans>
                <br />
                {t('Switch to') + ' '}
                <Link color={linkColour} href={getMirrorUrl(SWITCH_INSTANCE, rmgRuntime.getEnv())} isExternal={true}>
                    {mirrorName[SWITCH_INSTANCE]} <Icon as={MdOpenInNew} />
                </Link>
            </Text>
        </Flex>
    );
}
