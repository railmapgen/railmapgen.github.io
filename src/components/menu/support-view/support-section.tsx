import classes from './support-section.module.css';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { IoLogoGithub } from 'react-icons/io5';
import { SiZulip } from 'react-icons/si';
import { MdOpenInNew } from 'react-icons/md';
import { Events } from '../../../util/constants';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Button, Image, Stack, Title } from '@mantine/core';

export default function SupportSection() {
    const { t } = useTranslation();

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Help & support')}
                </Title>
            </RMSectionHeader>

            <Stack gap="xs">
                <Button
                    variant="default"
                    leftSection={<IoLogoGithub />}
                    rightSection={<MdOpenInNew />}
                    onClick={() => {
                        window.open('https://github.com/railmapgen/railmapgen.github.io/issues', '_blank');
                        rmgRuntime.event(Events.RAISE_ISSUE);
                    }}
                >
                    {t('Raise an Issue on GitHub')}
                </Button>
                <Button
                    variant="default"
                    leftSection={<SiZulip />}
                    rightSection={<MdOpenInNew />}
                    onClick={() => {
                        window.open('https://railmapgen.zulipchat.com/join/psex5yvk5b2g4vaq5chtkkrs/', '_blank');
                        rmgRuntime.event(Events.JOIN_ZULIP);
                    }}
                >
                    {t('Join our Community')}
                </Button>
                <Button
                    variant="default"
                    leftSection={<Image className={classes.bilibili} src="images/bilibili.svg" />}
                    rightSection={<MdOpenInNew />}
                    onClick={() => {
                        window.open('https://space.bilibili.com/10124055', '_blank');
                        rmgRuntime.event(Events.FOLLOW_BILIBILI);
                    }}
                >
                    {t('Follow us on Bilibili')}
                </Button>
            </Stack>
        </RMSection>
    );
}
