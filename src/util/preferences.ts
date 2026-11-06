import rmgRuntime from '@railmapgen/rmg-runtime';
import { OPTIONAL_LANGUAGES, SUPPORTED_LANGUAGES } from '@railmapgen/rmg-translate';
import { Events } from './constants';

export type Appearance = ReturnType<typeof rmgRuntime.getColourMode>;
export type Language = (typeof SUPPORTED_LANGUAGES)[number] | (typeof OPTIONAL_LANGUAGES)[number];
export type LanguagePreference = Language | 'system';

interface NativePreferences {
    appearance: Appearance;
    language: LanguagePreference;
    systemLanguage: string;
    systemAppearance: 'light' | 'dark';
    hasAppearance?: boolean;
    hasLanguage?: boolean;
}

interface PreferencesWindow extends Window {
    __RMT_NATIVE_PREFERENCES__?: NativePreferences;
    webkit?: {
        messageHandlers?: {
            rmtPreferences?: { postMessage(message: Record<string, string>): void };
        };
    };
}

const appearanceKey = 'rmg-runtime__colourMode';
const languageKey = 'rmg-runtime__language';
const languagePreferenceKey = 'rmt-language-preference';
const listeners = new Set<() => void>();
const languages: readonly string[] = [...SUPPORTED_LANGUAGES, ...OPTIONAL_LANGUAGES];
const isAppearance = (value: unknown): value is Appearance => ['light', 'dark', 'system'].includes(String(value));
const isLanguage = (value: unknown): value is Language => languages.includes(String(value));
const isLanguagePreference = (value: unknown): value is LanguagePreference => value === 'system' || isLanguage(value);
let nativePreferences: NativePreferences | undefined;

const nativeHandler = () => (window as PreferencesWindow).webkit?.messageHandlers?.rmtPreferences;

export const subscribePreferences = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const notify = () => listeners.forEach(listener => listener());

/** Match system locale tags, including the region-only Chinese tags used by iOS. */
export const resolveSystemLanguage = (preferredLanguages: readonly string[]): Language => {
    for (const language of preferredLanguages) {
        const parts = language.replaceAll('_', '-').toLowerCase().split('-');
        if (parts[0] === 'zh') {
            if (parts.includes('hant')) return 'zh-Hant';
            if (parts.includes('hans')) return 'zh-Hans';
            return parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-Hant' : 'zh-Hans';
        }
        if (isLanguage(parts[0])) return parts[0];
    }
    return 'en';
};

export const getAppearancePreference = (): Appearance => rmgRuntime.getColourMode();

export const getLanguagePreference = (): LanguagePreference => {
    const preference = window.localStorage.getItem(languagePreferenceKey);
    if (isLanguagePreference(preference)) return preference;
    // Preserve the explicit selections made before the System option existed.
    const previous = window.localStorage.getItem(languageKey);
    return isLanguage(previous) ? previous : 'system';
};

export const getResolvedLanguage = (): Language => {
    const preference = getLanguagePreference();
    return preference === 'system'
        ? resolveSystemLanguage(nativePreferences ? [nativePreferences.systemLanguage] : window.navigator.languages)
        : preference;
};

const applyLanguage = (preference: LanguagePreference, broadcast = true) => {
    window.localStorage.setItem(languagePreferenceKey, preference);
    const language = getResolvedLanguage();
    if (rmgRuntime.getLanguage() !== language) {
        if (broadcast) rmgRuntime.setLanguage(language);
        else window.localStorage.setItem(languageKey, language);
    }
    const i18n = rmgRuntime.getI18nInstance();
    if (i18n.language !== language) void i18n.changeLanguage(language);
};

const applyAppearance = (appearance: Appearance, broadcast = true) => {
    if (rmgRuntime.getColourMode() !== appearance) {
        if (broadcast) rmgRuntime.setColourMode(appearance);
        else window.localStorage.setItem(appearanceKey, appearance);
    }
    const resolved =
        appearance === 'system'
            ? (nativePreferences?.systemAppearance ??
              (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
            : appearance;
    // Mantine keeps its own storage key; seed it before the provider renders.
    window.localStorage.setItem('mantine-color-scheme-value', appearance === 'system' ? 'auto' : appearance);
    // Legacy Chakra child applications still consume this resolved value.
    window.localStorage.setItem('chakra-ui-color-mode', resolved);
    document.documentElement.dataset.mantineColorScheme = resolved;
};

export const setAppearancePreference = (appearance: Appearance) => {
    if (!isAppearance(appearance)) return;
    applyAppearance(appearance);
    nativeHandler()?.postMessage({ type: 'set', appearance });
    notify();
};

export const setLanguagePreference = (language: LanguagePreference) => {
    if (!isLanguagePreference(language)) return;
    applyLanguage(language);
    nativeHandler()?.postMessage({ type: 'set', language });
    rmgRuntime.event(Events.CHANGE_LANGUAGE, { language });
    notify();
};

const acceptNativePreferences = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const preferences = value as NativePreferences;
    if (
        !isAppearance(preferences.appearance) ||
        !isLanguagePreference(preferences.language) ||
        typeof preferences.systemLanguage !== 'string' ||
        !['light', 'dark'].includes(preferences.systemAppearance)
    )
        return;
    nativePreferences = preferences;
    // Unset native defaults must not erase existing web preferences during migration.
    applyAppearance(preferences.hasAppearance === false ? getAppearancePreference() : preferences.appearance);
    applyLanguage(preferences.hasLanguage === false ? getLanguagePreference() : preferences.language);
    notify();
};

/** Install once for the host lifetime, before rendering the application. */
export const installPreferences = () => {
    let active = true;
    const refresh = () => {
        applyAppearance(getAppearancePreference());
        applyLanguage(getLanguagePreference());
        nativeHandler()?.postMessage({
            type: 'get',
            appearance: getAppearancePreference(),
            language: getLanguagePreference(),
        });
        notify();
    };
    const onNative = (event: Event) => acceptNativePreferences((event as CustomEvent).detail);
    const onVisible = () => {
        if (document.visibilityState === 'visible') refresh();
    };
    const onAppearance = (appearance: Appearance) => {
        if (!active || !isAppearance(appearance)) return;
        applyAppearance(appearance, false);
        nativeHandler()?.postMessage({ type: 'set', appearance });
        notify();
    };
    const onLanguage = (language: string) => {
        if (!active || !isLanguage(language)) return;
        const preference =
            getLanguagePreference() === 'system' && language === getResolvedLanguage() ? 'system' : language;
        applyLanguage(preference, false);
        nativeHandler()?.postMessage({ type: 'set', language: preference });
        notify();
    };
    const onStorage = (event: StorageEvent) => {
        if (event.storageArea !== window.localStorage) return;
        // A child can write storage before its runtime broadcast arrives. Accept
        // that selection directly instead of reapplying the previous preference.
        if (event.key === appearanceKey) onAppearance(getAppearancePreference());
        else if (event.key === languageKey && isLanguage(event.newValue)) onLanguage(event.newValue);
        else if (event.key === languagePreferenceKey) {
            const language = getLanguagePreference();
            applyLanguage(language, false);
            nativeHandler()?.postMessage({ type: 'set', language });
            notify();
        } else if (event.key === null) refresh();
    };
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystemAppearance = () => {
        applyAppearance(getAppearancePreference());
        notify();
    };
    window.addEventListener('rmt-native-preferences', onNative);
    window.addEventListener('languagechange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    media?.addEventListener('change', onSystemAppearance);
    rmgRuntime.onColourModeChange(onAppearance);
    rmgRuntime.onLanguageChange(onLanguage);
    acceptNativePreferences((window as PreferencesWindow).__RMT_NATIVE_PREFERENCES__);
    refresh();

    return () => {
        active = false;
        nativePreferences = undefined;
        window.removeEventListener('rmt-native-preferences', onNative);
        window.removeEventListener('languagechange', refresh);
        window.removeEventListener('focus', refresh);
        window.removeEventListener('storage', onStorage);
        document.removeEventListener('visibilitychange', onVisible);
        media?.removeEventListener('change', onSystemAppearance);
    };
};
