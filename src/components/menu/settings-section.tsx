import React from 'react';
import { Box, Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField, useRmgColourMode } from '@railmapgen/rmg-components';
import { LANGUAGE_NAMES, LanguageCode, SUPPORTED_LANGUAGES, SupportedLanguageCode } from '@railmapgen/rmg-translate';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { Events } from '../../util/constants';

const style: SystemStyleObject = {
    flexDirection: 'column',

    '& h5': {
        mx: 1,
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
            options: SUPPORTED_LANGUAGES.reduce(
                (acc, cur) => ({
                    ...acc,
                    [cur]: LANGUAGE_NAMES[cur][cur],
                }),
                {} as Record<SupportedLanguageCode, string>
            ),
            onChange: value => {
                const language = value as LanguageCode;
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
            <Heading as="h5" size="sm">
                {t('Settings')}
            </Heading>

            <Box>
                <RmgFields fields={fields} />
            </Box>
        </Flex>
    );
}
