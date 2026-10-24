import classes from './app-item-button.module.css';
import { Events } from '../../../util/constants';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { MdChevronRight, MdOpenInNew } from 'react-icons/md';
import { assetEnablement, getAvailableAsset } from '../../../util/asset-enablements';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Flex, NavLink, Title } from '@mantine/core';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openTempApp, toggleMenu } from '../../../redux/app/app-slice';
import useSmMediaQuery from '../../hook/use-sm-media-query';

export default function LinksSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { activeTab, isShowMenu } = useRootSelector(state => state.app);
    const smMediaQuery = useSmMediaQuery();

    const availableLinks = getAvailableAsset('link', rmgRuntime.getEnv(), rmgRuntime.getInstance());

    const handleOpenLink = (id: string) => {
        rmgRuntime.event(Events.OPEN_LINK, { id });
        if (id === 'tauri') {
            dispatch(openTempApp('tauri'));
            if (!smMediaQuery && isShowMenu) {
                dispatch(toggleMenu());
                rmgRuntime.toggleNavMenu(false);
            }
        }
    };

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Useful links')}
                </Title>
            </RMSectionHeader>
            <Flex direction="column">
                {availableLinks.map(id => {
                    if (id === 'tauri') {
                        return (
                            <NavLink
                                key={id}
                                component="button"
                                type="button"
                                variant="filled"
                                active={activeTab === id}
                                label={t(assetEnablement[id].name)}
                                classNames={{ root: classes.button, label: classes.label }}
                                rightSection={<MdChevronRight />}
                                onClick={() => handleOpenLink(id)}
                            />
                        );
                    }
                    return (
                        <NavLink
                            key={id}
                            variant="filled"
                            label={t(assetEnablement[id].name)}
                            classNames={{ root: classes.button, label: classes.label }}
                            rightSection={<MdOpenInNew />}
                            href={assetEnablement[id].url}
                            target="_blank"
                            onClick={() => handleOpenLink(id)}
                        />
                    );
                })}
            </Flex>
        </RMSection>
    );
}
