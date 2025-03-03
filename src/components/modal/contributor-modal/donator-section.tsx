import { useTranslation } from 'react-i18next';
import useDonators from '../../hook/use-donators';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Title } from '@mantine/core';
import AvatarWall from './avatar-wall';

export default function DonatorSection() {
    const { t } = useTranslation();

    const { donators, isLoading, isError } = useDonators();

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {'❤️ ' + t('Donators')}
                </Title>
            </RMSectionHeader>

            <AvatarWall contributors={donators} isLoading={isLoading} isError={isError} />
        </RMSection>
    );
}
