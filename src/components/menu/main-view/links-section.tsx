import classes from './app-item-button.module.css';
import { Events } from '../../../util/constants';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { assetEnablement, getAvailableAsset } from '../../../util/asset-enablements';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Flex, NavLink, Title } from '@mantine/core';

export default function LinksSection() {
    const { t } = useTranslation();

    const availableLinks = getAvailableAsset('link', rmgRuntime.getEnv(), rmgRuntime.getInstance());

    const handleOpenLink = (id: string) => {
        rmgRuntime.event(Events.OPEN_LINK, { id });
    };

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Useful links')}
                </Title>
            </RMSectionHeader>
            <Flex direction="column">
                {availableLinks.map(id => (
                    <NavLink
                        key={id}
                        variant="filled"
                        label={t(assetEnablement[id].name)}
                        classNames={{ root: classes.button, label: classes.label }}
                        rightSection={<MdOpenInNew />}
                        href={assetEnablement[id].url}
                        target="_blank"
                        onClick={() => handleOpenLink(id)}
                    ></NavLink>
                ))}
            </Flex>
        </RMSection>
    );
}
