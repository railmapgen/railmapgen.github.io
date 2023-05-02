import { Button, Divider, Flex, Grid, GridItem, Icon, Link, Text, useColorModeValue } from '@chakra-ui/react';
import rmgRuntime, { RmgInstance } from '@railmapgen/rmg-runtime';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MdOpenInNew, MdPeople, MdPrivacyTip } from 'react-icons/md';
import { Events, getMirrorUrl, mirrorName } from '../../util/constants';
import ContributorModal from '../modal/contributor-modal';
import PrivacyModal from '../modal/privacy-modal';
import { IoLogoSlack } from 'react-icons/io5';

export default function NavMenuFooter() {
    const { t } = useTranslation();
    const linkColour = useColorModeValue('primary.500', 'primary.300');

    const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

    const instance = rmgRuntime.getInstance();
    const switchInstance = instance === RmgInstance.GITHUB ? RmgInstance.GITLAB : RmgInstance.GITHUB;
    const mirror = mirrorName[instance];

    const handleSwitchMirror = () => {
        const mirrorUrl = getMirrorUrl(switchInstance, rmgRuntime.getEnv());
        window.open(mirrorUrl, '_blank');
        rmgRuntime.event(Events.SWITCH_MIRROR, { mirrorUrl });
    };

    return (
        <Flex direction="column">
            <Text fontSize="sm" textAlign="center" width="100%">
                <Trans i18nKey="NavMenuFooter.currentMirror" mirror={mirror}>
                    You&apos;re on {{ mirror }} mirror
                </Trans>
                <br />
                {t('Switch to') + ' '}
                <Link color={linkColour} onClick={handleSwitchMirror}>
                    {mirrorName[switchInstance]} <Icon as={MdOpenInNew} />
                </Link>
            </Text>

            <Divider />

            <Grid templateColumns="repeat(3, auto)">
                <GridItem>
                    <Button
                        as={Link}
                        variant="ghost"
                        size="sm"
                        w="100%"
                        leftIcon={<IoLogoSlack />}
                        target="_blank"
                        href="https://join.slack.com/t/railmapgenerator/shared_invite/zt-1odhhta3n-DdZF~fnVwo_q0S0RJmgV8A"
                    >
                        Slack
                    </Button>
                </GridItem>

                <GridItem>
                    <Button
                        variant="ghost"
                        size="sm"
                        w="100%"
                        leftIcon={<MdPeople />}
                        onClick={() => setIsContributorModalOpen(true)}
                    >
                        {t('Contributors')}
                    </Button>
                </GridItem>

                <GridItem>
                    <Button
                        variant="ghost"
                        size="sm"
                        w="100%"
                        leftIcon={<MdPrivacyTip />}
                        onClick={() => setIsPrivacyModalOpen(true)}
                    >
                        {t('Privacy')}
                    </Button>
                </GridItem>
            </Grid>

            <ContributorModal isOpen={isContributorModalOpen} onClose={() => setIsContributorModalOpen(false)} />
            <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
        </Flex>
    );
}
