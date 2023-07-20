import React from 'react';
import { Box, Button, Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField, useRmgColourMode } from '@railmapgen/rmg-components';
import {
    LANGUAGE_NAMES,
    OPTIONAL_LANGUAGES,
    OptionalLanguageCode,
    SUPPORTED_LANGUAGES,
    SupportedLanguageCode,
} from '@railmapgen/rmg-translate';
import rmgRuntime, { RmgInstance } from '@railmapgen/rmg-runtime';
import { Events, getMirrorUrl, mirrorName } from '../../util/constants';

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

    const instance = rmgRuntime.getInstance();
    const switchInstance = instance === RmgInstance.GITHUB ? RmgInstance.GITLAB : RmgInstance.GITHUB;

    const handleSwitchMirror = () => {
        const mirrorUrl = getMirrorUrl(switchInstance, rmgRuntime.getEnv());
        window.open(mirrorUrl, '_blank');
        rmgRuntime.event(Events.SWITCH_MIRROR, { mirrorUrl });
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
        {
            type: 'custom',
            label: t('Switch to') + ' ' + mirrorName[switchInstance],
            component: (
                <Button size="xs" onClick={handleSwitchMirror}>
                    {t('Switch')}
                </Button>
            ),
            minW: 'full',
            oneLine: true,
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
