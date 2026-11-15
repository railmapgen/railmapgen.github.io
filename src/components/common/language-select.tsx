import { ComboboxData, NativeSelect, NativeSelectProps } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import {
    LANGUAGE_NAMES,
    OPTIONAL_LANGUAGES,
    OptionalLanguageCode,
    SUPPORTED_LANGUAGES,
    SupportedLanguageCode,
} from '@railmapgen/rmg-translate';
import { Events } from '../../util/constants';

export default function LanguageSelect(props: NativeSelectProps) {
    const { t } = useTranslation();

    const options: ComboboxData = [
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
            defaultValue={rmgRuntime.getLanguage()}
            onChange={({ currentTarget: { value } }) => {
                const language = value as SupportedLanguageCode | OptionalLanguageCode;
                rmgRuntime.setLanguage(language);
                rmgRuntime.getI18nInstance().changeLanguage(language);
                rmgRuntime.event(Events.CHANGE_LANGUAGE, { language });
            }}
            data={options}
            {...props}
        />
    );
}
