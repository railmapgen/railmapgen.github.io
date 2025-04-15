import classes from './contributor-modal.module.css';
import { useTranslation } from 'react-i18next';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Avatar, Card, Flex, Text, Title } from '@mantine/core';

export default function DevTeamSection() {
    const { t } = useTranslation();

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Developer team')}
                </Title>
            </RMSectionHeader>

            <RMSectionBody className={classes['dev-section-body']}>
                <Card
                    component="a"
                    className={classes['dev-card']}
                    href="https://github.com/wongchito"
                    target="_blank"
                    withBorder
                >
                    <Avatar src="https://github.com/wongchito.png" size="lg" />
                    <Flex>
                        <Title order={3}>Chito Wong</Title>
                        <Text span>Author of Rail Map Toolkit platform</Text>
                        <Text span>Author of Rail Map Generator</Text>
                    </Flex>
                </Card>
                <Card
                    component="a"
                    className={classes['dev-card']}
                    href="https://github.com/thekingofcity"
                    target="_blank"
                    withBorder
                >
                    <Avatar src="https://github.com/thekingofcity.png" size="lg" />
                    <Flex>
                        <Title order={3}>thekingofcity</Title>
                        <Text span>Author of Rail Map Painter</Text>
                        <Text span>Author of Rail Map Announcer</Text>
                    </Flex>
                </Card>
                <Card
                    component="a"
                    className={classes['dev-card']}
                    href="https://github.com/langonginc"
                    target="_blank"
                    withBorder
                >
                    <Avatar src="https://github.com/langonginc.png" size="lg" />
                    <Flex>
                        <Title order={3}>langonginc</Title>
                        <Text span>Author of Rail Map Painter</Text>
                    </Flex>
                </Card>
            </RMSectionBody>
        </RMSection>
    );
}
