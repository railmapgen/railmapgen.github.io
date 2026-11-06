import { NavLink, Stack, Title } from '@mantine/core';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { LANGUAGE_NAMES, OPTIONAL_LANGUAGES, SUPPORTED_LANGUAGES } from '@railmapgen/rmg-translate';
import { useTranslation } from 'react-i18next';
import { MdCheck } from 'react-icons/md';
import classes from './main-view/app-item-button.module.css';
import { useSyncExternalStore } from 'react';
import { getLanguagePreference, setLanguagePreference, subscribePreferences } from '../../util/preferences';

export default function LanguageView() {
    const { t, i18n } = useTranslation();
    const preference = useSyncExternalStore(subscribePreferences, getLanguagePreference);

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Language')}
                </Title>
            </RMSectionHeader>

            <Stack gap="xs" py="xs">
                {(['system', ...SUPPORTED_LANGUAGES, ...OPTIONAL_LANGUAGES] as const).map(language => {
                    const active =
                        language === 'system'
                            ? preference === 'system'
                            : preference !== 'system' && i18n.language === language;
                    return (
                        <NavLink
                            key={language}
                            component="button"
                            type="button"
                            lang={language === 'system' ? undefined : language}
                            label={language === 'system' ? t('System') : LANGUAGE_NAMES[language][language]}
                            active={active}
                            aria-pressed={active}
                            variant="filled"
                            classNames={{ root: classes.button, label: classes.label }}
                            rightSection={active ? <MdCheck /> : undefined}
                            onClick={() => setLanguagePreference(language)}
                        />
                    );
                })}
            </Stack>
        </RMSection>
    );
}
