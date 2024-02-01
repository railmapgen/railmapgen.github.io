import { Box, Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField, useRmgColourMode } from '@railmapgen/rmg-components';
import {
    LANGUAGE_NAMES,
    OPTIONAL_LANGUAGES,
    OptionalLanguageCode,
    SUPPORTED_LANGUAGES,
    SupportedLanguageCode,
} from '@railmapgen/rmg-translate';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../../util/constants';

const style: SystemStyleObject = {
    flexDirection: 'column',
    py: 1,

    '& h4': {
        mx: 3,
        my: 2,
    },

    '& > div': {
        px: 2,
    },
};

export default function SettingsSection() {
    const { t } = useTranslation();
    const { setColourMode } = useRmgColourMode();

    const appearanceOptions = {
        light: t('Light'),
        dark: t('Dark'),
        system: t('System'),
    };

    const fields: RmgFieldsField[] = [
        {
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
        },
        {
            type: 'select',
            label: t('Appearance'),
            value: rmgRuntime.getColourMode(),
            options: appearanceOptions,
            onChange: value => setColourMode(value as keyof typeof appearanceOptions),
        },
    ];

    return (
        <Flex sx={style}>
            <Heading as="h4" size="md">
                {t('Settings')}
            </Heading>

            <Box>
                <RmgFields fields={fields} />
            </Box>
        </Flex>
    );
}
