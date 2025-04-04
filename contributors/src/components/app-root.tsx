import { RMMantineProvider, RMPage, RMWindow, RMWindowHeader } from '@railmapgen/mantine-components';
import { Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import ContributorModal from './contributor-modal';

export default function AppRoot() {
    const { t } = useTranslation();

    return (
        <RMMantineProvider>
            <RMWindow>
                <RMWindowHeader>
                    <Title>{t('Contributors')}</Title>
                </RMWindowHeader>
                <RMPage w={{ base: '100%', sm: 600 }} style={{ alignSelf: 'center' }}>
                    <ContributorModal />
                </RMPage>
            </RMWindow>
        </RMMantineProvider>
    );
}
