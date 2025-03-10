import classes from './workspace.module.css';
import { useTranslation } from 'react-i18next';
import rmpLogo from '../../images/rmp-logo512.png';
import { Group, Image, Stack, Text, Title } from '@mantine/core';
import { useRootDispatch } from '../../redux';
import { openApp } from '../../redux/app/app-slice';

export default function Welcome() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    return (
        <Stack className={classes.welcome}>
            <Group className={classes.icons} grow>
                <Image
                    src={import.meta.env.BASE_URL + 'logo512.png'}
                    title={t('Open') + ' ' + t('Rail Map Generator')}
                    onClick={() => dispatch(openApp({ appId: 'rmg' }))}
                />
                <Image
                    src={rmpLogo}
                    title={t('Open') + ' ' + t('Rail Map Painter')}
                    onClick={() => dispatch(openApp({ appId: 'rmp' }))}
                />
            </Group>
            <Title>{t('Welcome to Rail Map Toolkit')}</Title>
            <Text>{t('Select an app to start your own rail map design!')}</Text>
        </Stack>
    );
}
