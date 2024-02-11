import rmgRuntime from '@railmapgen/rmg-runtime';
import {
    LANGUAGE_NAMES,
    OPTIONAL_LANGUAGES,
    OptionalLanguageCode,
    SUPPORTED_LANGUAGES,
    SupportedLanguageCode,
} from '@railmapgen/rmg-translate';
import { Events } from '../../util/constants';
import { useTranslation } from 'react-i18next';
import { RmgFieldsField } from '@railmapgen/rmg-components';

export default function useLanguageField(): RmgFieldsField {
    const { t } = useTranslation();

    return {
        type: 'select',
        label: t('Language'),
        value: rmgRuntime.getLanguage(),
        options: {
            [t('Main languages')]: SUPPORTED_LANGUAGES.reduce(
                (acc, cur) => ({
                    ...acc,
                    [cur]: LANGUAGE_NAMES[cur][cur],
                }),
                {} as Record<SupportedLanguageCode, string>
            ),
            [t('Other languages')]: OPTIONAL_LANGUAGES.reduce(
                (acc, cur) => ({
                    ...acc,
                    [cur]: LANGUAGE_NAMES[cur][cur],
                }),
                {} as Record<OptionalLanguageCode, string>
            ),
        },
        onChange: value => {
            const language = value as SupportedLanguageCode | OptionalLanguageCode;
            rmgRuntime.setLanguage(language);
            rmgRuntime.getI18nInstance().changeLanguage(language);
            rmgRuntime.event(Events.CHANGE_LANGUAGE, { language });
        },
    };
}
