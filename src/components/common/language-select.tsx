import { ComboboxData, NativeSelect, NativeSelectProps } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_NAMES, OPTIONAL_LANGUAGES, SUPPORTED_LANGUAGES } from '@railmapgen/rmg-translate';
import { useSyncExternalStore } from 'react';
import {
    getLanguagePreference,
    LanguagePreference,
    setLanguagePreference,
    subscribePreferences,
} from '../../util/preferences';

export default function LanguageSelect(props: NativeSelectProps) {
    const { t } = useTranslation();
    const language = useSyncExternalStore(subscribePreferences, getLanguagePreference);

    const options: ComboboxData = [
        { value: 'system', label: t('System') },
        {
            group: t('Main languages'),
            items: SUPPORTED_LANGUAGES.map(lang => ({ value: lang, label: LANGUAGE_NAMES[lang][lang] })),
        },
        {
            group: t('Other languages'),
            items: OPTIONAL_LANGUAGES.map(lang => ({
                value: lang,
                label: LANGUAGE_NAMES[lang][lang] ?? LANGUAGE_NAMES[lang].en,
            })),
        },
    ];

    return (
        <NativeSelect
            label={t('Language')}
            value={language}
            onChange={({ currentTarget: { value } }) => setLanguagePreference(value as LanguagePreference)}
            data={options}
            {...props}
        />
    );
}
