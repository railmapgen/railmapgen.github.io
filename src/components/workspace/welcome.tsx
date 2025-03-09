import classes from './workspace.module.css';
import { useTranslation } from 'react-i18next';
import rmpLogo from '../../images/rmp-logo512.png';
import { Group, Image, Stack, Text, Title } from '@mantine/core';

export default function Welcome() {
    const { t } = useTranslation();

    return (
        <Stack className={classes.welcome}>
            <Group className={classes.icons} grow>
                <Image src={import.meta.env.BASE_URL + 'logo512.png'} />
                <Image src={rmpLogo} />
            </Group>
            <Title>{t('Welcome to Rail Map Toolkit')}</Title>
            <Text>{t('Select an app to start your own rail map design!')}</Text>
        </Stack>
    );
}
