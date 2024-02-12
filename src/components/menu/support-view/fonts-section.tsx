import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { Button, Heading, SystemStyleObject, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRootSelector } from '../../../redux';
import { MdOpenInNew } from 'react-icons/md';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../../../util/constants';

const stackStyles: SystemStyleObject = {
    px: 2,

    '& button': {
        w: '100%',
    },
};

export default function FontsSection() {
    const { t } = useTranslation();

    const { remoteFonts } = useRootSelector(state => state.app);

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Web fonts')}
                </Heading>
            </RmgSectionHeader>

            <VStack sx={stackStyles}>
                <Text as="i" fontSize="sm">
                    {t('FontsSection.text1')} {t('FontsSection.text2')} {t('FontsSection.text3')} (
                    {t('FontsSection.safari')})
                </Text>

                {Object.entries(remoteFonts).map(([family, config]) => (
                    <Button
                        size="sm"
                        key={family}
                        rightIcon={config.url ? <MdOpenInNew /> : undefined}
                        isDisabled={!config.url}
                        onClick={() => {
                            window.open(config.url, '_blank');
                            rmgRuntime.event(Events.DOWNLOAD_FONT, { family });
                        }}
                    >
                        {config.displayName ? `${config.displayName} (${family})` : family}
                    </Button>
                ))}
            </VStack>
        </RmgSection>
    );
}
