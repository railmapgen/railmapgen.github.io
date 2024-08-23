import { Alert, AlertIcon, Box, Button, Heading } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField, RmgSection, RmgSectionHeader, useRmgColourMode } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../../util/constants';
import { useState } from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { hideDevtools, isShowDevtools, requireRefresh, showDevtools } from '../../redux/app/app-slice';
import useLanguageField from '../hook/use-language-field';
import LocalStorageModal from '../modal/local-storage-modal';

export default function SettingsView() {
    const { t } = useTranslation();
    const { setColourMode } = useRmgColourMode();

    const dispatch = useRootDispatch();
    const { lastShowDevtools, refreshRequired } = useRootSelector(state => state.app);

    const [allowCookies, setAllowCookies] = useState(rmgRuntime.isAllowAnalytics());
    const [isLocalStorageOpen, setIsLocalStorageOpen] = useState(false);
    const languageField = useLanguageField();

    const handleChangeCookiesSetting = (isAllow: boolean) => {
        setAllowCookies(isAllow);
        const allowAnalyticsResponse = rmgRuntime.allowAnalytics(isAllow);
        if (allowAnalyticsResponse.refreshRequired) {
            dispatch(requireRefresh());
        }
    };

    const appearanceOptions = {
        light: t('Light'),
        dark: t('Dark'),
        system: t('System'),
    };

    const fields: RmgFieldsField[] = [
        languageField,
        {
            type: 'select',
            label: t('Appearance'),
            value: rmgRuntime.getColourMode(),
            options: appearanceOptions,
            onChange: value => setColourMode(value as keyof typeof appearanceOptions),
        },
        {
            type: 'switch',
            label: t('Allow cookies to help improve our website'),
            isChecked: allowCookies,
            onChange: handleChangeCookiesSetting,
            oneLine: true,
            isDisabled: refreshRequired,
        },
        {
            type: 'switch',
            label: t('Show dev tools for 1 day'),
            isChecked: isShowDevtools(lastShowDevtools),
            onChange: checked => {
                if (checked) {
                    dispatch(showDevtools());
                    rmgRuntime.event(Events.SHOW_DEVTOOLS);
                } else {
                    dispatch(hideDevtools());
                }
            },
            oneLine: true,
        },
    ];

    return (
        <RmgSection>
            {refreshRequired && (
                <Alert status="info" variant="solid" size="xs">
                    <AlertIcon />
                    {t('Refreshing is required for changes to take effect.')}
                </Alert>
            )}

            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Settings')}
                </Heading>
            </RmgSectionHeader>

            <Box px={2}>
                <RmgFields fields={fields} minW="full" />
                <Button width="100%" onClick={() => setIsLocalStorageOpen(true)}>
                    {t('Export Local Storage')}
                </Button>
            </Box>
            <LocalStorageModal isOpen={isLocalStorageOpen} onClose={() => setIsLocalStorageOpen(false)} />
        </RmgSection>
    );
}
