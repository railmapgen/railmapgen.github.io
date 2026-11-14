import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../../util/constants';
import { useState, useSyncExternalStore } from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { hideDevtools, isShowDevtools, requireRefresh, showDevtools } from '../../redux/app/app-slice';
import LocalStorageModal from '../modal/local-storage-modal';
import { RMLabelledSegmentedControl, RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Alert, Button, Stack, Switch, Title } from '@mantine/core';
import { MdOutlineInfo, MdOutlineSaveAlt } from 'react-icons/md';
import {
    Appearance,
    getAppearancePreference,
    setAppearancePreference,
    subscribePreferences,
} from '../../util/preferences';

export default function SettingsView() {
    const { t } = useTranslation();
    const appearance = useSyncExternalStore(subscribePreferences, getAppearancePreference);

    const dispatch = useRootDispatch();
    const { lastShowDevtools, refreshRequired } = useRootSelector(state => state.app);

    const [allowCookies, setAllowCookies] = useState(rmgRuntime.isAllowAnalytics());
    const [isLocalStorageOpen, setIsLocalStorageOpen] = useState(false);

    const isDevtoolsShown = isShowDevtools(lastShowDevtools);

    const handleChangeCookiesSetting = (isAllow: boolean) => {
        setAllowCookies(isAllow);
        const allowAnalyticsResponse = rmgRuntime.allowAnalytics(isAllow);
        if (allowAnalyticsResponse.refreshRequired) {
            dispatch(requireRefresh());
        }
    };

    const appearanceOptions = [
        { value: 'light', label: t('Light') },
        { value: 'dark', label: t('Dark') },
        { value: 'system', label: t('System') },
    ];

    return (
        <RMSection>
            {refreshRequired && (
                <Alert color="blue" icon={<MdOutlineInfo />} mb="xs">
                    {t('Refreshing is required for changes to take effect.')}
                </Alert>
            )}

            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Settings')}
                </Title>
            </RMSectionHeader>

            <Stack gap="xs" py="xs">
                <RMLabelledSegmentedControl
                    size="sm"
                    label={t('Appearance')}
                    value={appearance}
                    onChange={value => setAppearancePreference(value as Appearance)}
                    data={appearanceOptions}
                />
                <Switch
                    label={t('Allow cookies to help improve our application')}
                    labelPosition="left"
                    checked={allowCookies}
                    onChange={({ currentTarget: { checked } }) => handleChangeCookiesSetting(checked)}
                    disabled={refreshRequired}
                    styles={{ labelWrapper: { flex: 1 } }}
                />
                <Switch
                    label={t('Show dev tools for 1 day')}
                    labelPosition="left"
                    checked={isDevtoolsShown}
                    onChange={({ currentTarget: { checked } }) => {
                        if (checked) {
                            dispatch(showDevtools());
                            rmgRuntime.event(Events.SHOW_DEVTOOLS);
                        } else {
                            dispatch(hideDevtools());
                        }
                    }}
                    styles={{ labelWrapper: { flex: 1 } }}
                />
                {isDevtoolsShown && (
                    <Button
                        variant="default"
                        leftSection={<MdOutlineSaveAlt />}
                        onClick={() => setIsLocalStorageOpen(true)}
                    >
                        {t('Export Local Storage')}
                    </Button>
                )}
            </Stack>

            {isDevtoolsShown && (
                <LocalStorageModal opened={isLocalStorageOpen} onClose={() => setIsLocalStorageOpen(false)} />
            )}
        </RMSection>
    );
}
