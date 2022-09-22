import { Divider, Flex, HStack, Icon, IconButton, Link, Text, useColorModeValue } from '@chakra-ui/react';
import rmgRuntime, { RmgInstance } from '@railmapgen/rmg-runtime';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MdHelp, MdOpenInNew, MdPeople } from 'react-icons/md';
import { getMirrorUrl, mirrorName } from '../../util/constants';
import HelpModal from '../modal/help-modal';
import ContributorModal from '../modal/contributor-modal';

const INSTANCE = rmgRuntime.getInstance();
const SWITCH_INSTANCE = INSTANCE === RmgInstance.GITHUB ? RmgInstance.GITLAB : RmgInstance.GITHUB;

export default function NavMenuFooter() {
    const { t } = useTranslation();
    const linkColour = useColorModeValue('primary.500', 'primary.300');

    const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const mirror = mirrorName[INSTANCE];

    return (
        <Flex direction="column">
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

            <Divider />

            <HStack justifyContent="center">
                <IconButton
                    variant="ghost"
                    size="xs"
                    aria-label={t('Contributor')}
                    title={t('Contributor')}
                    icon={<MdPeople />}
                    onClick={() => setIsContributorModalOpen(true)}
                />

                <IconButton
                    variant="ghost"
                    size="xs"
                    aria-label={t('Help and support')}
                    title={t('Help and support')}
                    icon={<MdHelp />}
                    onClick={() => setIsHelpModalOpen(true)}
                />
            </HStack>

            <ContributorModal isOpen={isContributorModalOpen} onClose={() => setIsContributorModalOpen(false)} />
            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        </Flex>
    );
}
