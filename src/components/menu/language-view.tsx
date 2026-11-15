import { NavLink, Stack, Title } from '@mantine/core';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { LANGUAGE_NAMES, OPTIONAL_LANGUAGES, SUPPORTED_LANGUAGES } from '@railmapgen/rmg-translate';
import { useTranslation } from 'react-i18next';
import { MdCheck } from 'react-icons/md';
import { Events } from '../../util/constants';
import classes from './main-view/app-item-button.module.css';

export default function LanguageView() {
    const { t, i18n } = useTranslation();

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Language')}
                </Title>
            </RMSectionHeader>

            <Stack gap="xs" py="xs">
                {[...SUPPORTED_LANGUAGES, ...OPTIONAL_LANGUAGES].map(language => (
                    <NavLink
                        key={language}
                        component="button"
                        type="button"
                        lang={language}
                        label={LANGUAGE_NAMES[language][language]}
                        active={i18n.language === language}
                        aria-pressed={i18n.language === language}
                        variant="filled"
                        classNames={{ root: classes.button, label: classes.label }}
                        rightSection={i18n.language === language ? <MdCheck /> : undefined}
                        onClick={() => {
                            rmgRuntime.setLanguage(language);
                            i18n.changeLanguage(language);
                            rmgRuntime.event(Events.CHANGE_LANGUAGE, { language });
                        }}
                    />
                ))}
            </Stack>
        </RMSection>
    );
}
