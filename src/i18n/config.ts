import rmgRuntime from '@railmapgen/rmg-runtime';
import { initReactI18next } from 'react-i18next';
import RmgTranslate, { LanguageCode, Translation } from '@railmapgen/rmg-translate';
import enTranslation from './translations/en.json';
import zhHansTranslation from './translations/zh-Hans.json';
import zhHantTranslation from './translations/zh-Hant.json';
import koTranslation from './translations/ko.json';

const i18n = new RmgTranslate.Builder()
    .use(initReactI18next)
    .withLng(rmgRuntime.getLanguage())
    .withResource('en', enTranslation)
    .withResource('zh-Hans', zhHansTranslation)
    .withResource('zh-Hant', zhHantTranslation)
    .withResource('ko', koTranslation)
    .build();

export default i18n;

export const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language).then();
};
rmgRuntime.onLanguageChange(handleLanguageChange);

export const translateText = (translation: Translation): string => {
    return (
        i18n.languages.map(lang => translation[lang as LanguageCode]).find(name => name !== undefined) ??
        translation.en ??
        '(Translation Error)'
    );
};
