import { useTranslation } from 'react-i18next';
import { useRootSelector } from '../../../redux';
import { MdOpenInNew } from 'react-icons/md';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../../../util/constants';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Button, Stack, Text, Title } from '@mantine/core';

export default function FontsSection() {
    const { t } = useTranslation();

    const { remoteFonts } = useRootSelector(state => state.app);

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Web fonts')}
                </Title>
            </RMSectionHeader>

            <Stack gap="xs">
                <Text fs="italic">
                    {t('FontsSection.text1')} {t('FontsSection.text2')} {t('FontsSection.text3')} (
                    {t('FontsSection.safari')})
                </Text>

                {Object.entries(remoteFonts).map(([family, config]) => (
                    <Button
                        key={family}
                        variant="default"
                        rightSection={config.url ? <MdOpenInNew /> : undefined}
                        disabled={!config.url}
                        onClick={() => {
                            window.open(config.url, '_blank');
                            rmgRuntime.event(Events.DOWNLOAD_FONT, { family });
                        }}
                    >
                        {config.displayName ? `${config.displayName} (${family})` : family}
                    </Button>
                ))}
            </Stack>
        </RMSection>
    );
}
