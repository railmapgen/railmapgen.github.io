import { Button, Divider, Flex, Grid, GridItem, Link } from '@chakra-ui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdPeople, MdPrivacyTip } from 'react-icons/md';
import ContributorModal from '../modal/contributor-modal';
import PrivacyModal from '../modal/privacy-modal';
import { IoLogoSlack } from 'react-icons/io5';

export default function NavMenuFooter() {
    const { t } = useTranslation();

    const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

    return (
        <Flex direction="column">
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
