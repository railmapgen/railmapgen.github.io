import { Button, Heading, SystemStyleObject, VStack } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { IoLogoGithub, IoLogoSlack } from 'react-icons/io5';
import { Events } from '../../../util/constants';
import rmgRuntime from '@railmapgen/rmg-runtime';

const stackStyles: SystemStyleObject = {
    px: 2,

    '& button': {
        w: '100%',
    },
};

export default function SupportSection() {
    const { t } = useTranslation();

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Help & support')}
                </Heading>
            </RmgSectionHeader>

            <VStack sx={stackStyles}>
                <Button
                    size="md"
                    leftIcon={<IoLogoGithub />}
                    rightIcon={<MdOpenInNew />}
                    onClick={() => {
                        window.open('https://github.com/railmapgen/railmapgen.github.io/issues', '_blank');
                        rmgRuntime.event(Events.RAISE_ISSUE);
                    }}
                >
                    {t('Raise an Issue on GitHub')}
                </Button>
                <Button
                    size="md"
                    leftIcon={<IoLogoSlack />}
                    rightIcon={<MdOpenInNew />}
                    onClick={() => {
                        window.open(
                            'https://join.slack.com/t/railmapgenerator/shared_invite/zt-1odhhta3n-DdZF~fnVwo_q0S0RJmgV8A',
                            '_blank'
                        );
                        rmgRuntime.event(Events.JOIN_SLACK);
                    }}
                >
                    {t('Join us on Slack')}
                </Button>
            </VStack>
        </RmgSection>
    );
}
