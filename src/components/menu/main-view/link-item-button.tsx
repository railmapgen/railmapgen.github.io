import { NavLink, NavLinkProps } from '@mantine/core';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { MdChevronRight, MdOpenInNew } from 'react-icons/md';
import { useRootSelector } from '../../../redux';
import { assetEnablement, tempAssets } from '../../../util/asset-enablements';
import { Events } from '../../../util/constants';
import useOpenTempApp from '../../hook/use-open-temp-app';
import classes from './app-item-button.module.css';

type LinkItemButtonProps = {
    linkId: string;
};

export default function LinkItemButton({ linkId }: LinkItemButtonProps) {
    const { t } = useTranslation();
    const activeTab = useRootSelector(state => state.app.activeTab);
    const openTempApp = useOpenTempApp();
    const link = assetEnablement[linkId];
    const isTempApp = Object.hasOwn(tempAssets, linkId);

    const handleOpenLink = () => {
        rmgRuntime.event(Events.OPEN_LINK, { id: linkId });
        if (isTempApp) {
            openTempApp(linkId);
        }
    };

    const sharedProps: NavLinkProps = {
        variant: 'filled',
        label: t(link.name),
        classNames: { root: classes.button, label: classes.label },
        onClick: handleOpenLink,
    };

    if (isTempApp) {
        return (
            <NavLink
                {...sharedProps}
                component="button"
                type="button"
                active={activeTab === linkId}
                rightSection={<MdChevronRight />}
            />
        );
    }

    return <NavLink {...sharedProps} href={link.url} target="_blank" rightSection={<MdOpenInNew />} />;
}
