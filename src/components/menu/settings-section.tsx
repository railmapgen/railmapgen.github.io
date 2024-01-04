import { Box, Button, Flex, Heading, HStack, SystemStyleObject } from '@chakra-ui/react';
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
import { MdOpenInNew } from 'react-icons/md';

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

    '& .chakra-stack > button': {
        flex: 1,
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
    const switchInstance: RmgInstance = instance === 'GitHub' ? 'GitLab' : 'GitHub';

    const handleSwitchMirror = () => {
        const mirrorUrl = getMirrorUrl(switchInstance, rmgRuntime.getEnv());
        window.open(mirrorUrl, '_blank');
        rmgRuntime.event(Events.SWITCH_MIRROR, { mirrorUrl });
    };

    const handleDownloadApp = () => {
        const d = new Date();
        const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`;
        const ver = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.1`;
        const platform = navigator.platform;
        const suffix = platform.includes('Linux')
            ? 'amd64.deb'
            : platform.includes('Mac')
              ? 'x64.dmg'
              : 'x64-setup.exe';
        const url = `https://mirror.ghproxy.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-${tag}/railmapgen_${ver}_${suffix}`;
        window.open(url, '_blank');
        rmgRuntime.event(Events.DOWNLOAD_APP, {});
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
                <HStack>
                    <Button variant="outline" size="xs" rightIcon={<MdOpenInNew />} onClick={handleSwitchMirror}>
                        {t('Switch to') + ' ' + mirrorName[switchInstance]}
                    </Button>

                    <Button variant="outline" size="xs" rightIcon={<MdOpenInNew />} onClick={handleDownloadApp}>
                        {t('Download offline app')}
                    </Button>
                </HStack>
            </Box>
        </Flex>
    );
}
