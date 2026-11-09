import rmgRuntime from '@railmapgen/rmg-runtime';
import i18n from '../i18n/config';
import {
    getAppearancePreference,
    getLanguagePreference,
    installPreferences,
    resolveSystemLanguage,
    setAppearancePreference,
    setLanguagePreference,
} from './preferences';

describe('system preferences', () => {
    let release: (() => void) | undefined;
    const postMessage = vi.fn();
    let media: MediaQueryList;
    let dark: boolean;
    const publish = (preferences: Record<string, unknown>) =>
        window.dispatchEvent(new CustomEvent('rmt-native-preferences', { detail: preferences }));
    const native = {
        appearance: 'system',
        language: 'system',
        systemLanguage: 'zh-Hant',
        systemAppearance: 'dark',
    };

    beforeEach(() => {
        vi.spyOn(rmgRuntime, 'getInstance').mockReturnValue('AppStore');
        window.localStorage.clear();
        postMessage.mockClear();
        Object.defineProperty(window, 'webkit', {
            configurable: true,
            value: { messageHandlers: { rmtPreferences: { postMessage } } },
        });
        dark = false;
        media = Object.assign(new EventTarget(), { media: '(prefers-color-scheme: dark)' }) as MediaQueryList;
        Object.defineProperty(media, 'matches', { get: () => dark });
        vi.spyOn(window, 'matchMedia').mockReturnValue(media);
        vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US']);
    });

    afterEach(async () => {
        release?.();
        release = undefined;
        Reflect.deleteProperty(window, 'webkit');
        Reflect.deleteProperty(window, '__RMT_NATIVE_PREFERENCES__');
        window.localStorage.clear();
        delete document.documentElement.dataset.mantineColorScheme;
        document.documentElement.lang = 'en';
        vi.restoreAllMocks();
        await i18n.changeLanguage('en');
    });

    it('matches regional language tags and falls back to the next supported language', () => {
        expect(resolveSystemLanguage(['zh-TW'])).toBe('zh-Hant');
        expect(resolveSystemLanguage(['zh-HK'])).toBe('zh-Hant');
        expect(resolveSystemLanguage(['zh-Hans-HK'])).toBe('zh-Hans');
        expect(resolveSystemLanguage(['zh-CN'])).toBe('zh-Hans');
        expect(resolveSystemLanguage(['fr-FR', 'ja-JP'])).toBe('ja');
        expect(resolveSystemLanguage(['ko_KR'])).toBe('ko');
        expect(resolveSystemLanguage(['fr-FR'])).toBe('en');
    });

    it('updates System appearance live while explicit appearance ignores OS changes', () => {
        release = installPreferences();
        expect(document.documentElement.dataset.mantineColorScheme).toBe('light');
        dark = true;
        media.dispatchEvent(new Event('change'));
        expect(document.documentElement.dataset.mantineColorScheme).toBe('dark');
        expect(window.localStorage.getItem('chakra-ui-color-mode')).toBe('dark');

        setAppearancePreference('light');
        media.dispatchEvent(new Event('change'));
        expect(document.documentElement.dataset.mantineColorScheme).toBe('light');
        expect(window.localStorage.getItem('mantine-color-scheme-value')).toBe('light');
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'set', appearance: 'light' });
        setAppearancePreference('system');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('dark');
        expect(window.localStorage.getItem('mantine-color-scheme-value')).toBe('auto');
    });

    it('follows language changes only while System is selected', () => {
        release = installPreferences();
        expect(getLanguagePreference()).toBe('system');
        vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['ja-JP']);
        window.dispatchEvent(new Event('languagechange'));
        expect(i18n.language).toBe('ja');
        expect(rmgRuntime.getLanguage()).toBe('ja');
        expect(document.documentElement.lang).toBe('ja');

        setLanguagePreference('ko');
        window.dispatchEvent(new Event('languagechange'));
        expect(i18n.language).toBe('ko');
        expect(postMessage).toHaveBeenCalledWith({ type: 'set', language: 'ko' });
        setLanguagePreference('system');
        expect(i18n.language).toBe('ja');
        expect(getLanguagePreference()).toBe('system');
    });

    it('accepts saved native preferences before render and later native Settings updates without an echo', () => {
        Object.defineProperty(window, '__RMT_NATIVE_PREFERENCES__', { configurable: true, value: native });
        release = installPreferences();
        expect(getAppearancePreference()).toBe('system');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('dark');
        expect(getLanguagePreference()).toBe('system');
        expect(i18n.language).toBe('zh-Hant');
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'get', appearance: 'system', language: 'system' });

        postMessage.mockClear();
        publish({ ...native, appearance: 'light', language: 'ja' });
        expect(getAppearancePreference()).toBe('light');
        expect(getLanguagePreference()).toBe('ja');
        expect(i18n.language).toBe('ja');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('light');
        expect(postMessage).not.toHaveBeenCalled();

        publish({ ...native, systemLanguage: 'ko', systemAppearance: 'light' });
        expect(getLanguagePreference()).toBe('system');
        expect(i18n.language).toBe('ko');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('light');
    });

    it('migrates existing explicit selections instead of overwriting them with unset native defaults', () => {
        window.localStorage.setItem('rmg-runtime__colourMode', 'dark');
        window.localStorage.setItem('rmg-runtime__language', 'ja');
        Object.defineProperty(window, '__RMT_NATIVE_PREFERENCES__', {
            configurable: true,
            value: { ...native, hasAppearance: false, hasLanguage: false },
        });
        release = installPreferences();
        expect(getAppearancePreference()).toBe('dark');
        expect(getLanguagePreference()).toBe('ja');
        expect(i18n.language).toBe('ja');
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'get', appearance: 'dark', language: 'ja' });
    });

    it('requests current native settings on return to the app and ignores invalid snapshots', () => {
        release = installPreferences();
        setAppearancePreference('dark');
        postMessage.mockClear();
        window.dispatchEvent(new Event('focus'));
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'get', appearance: 'dark', language: 'system' });
        publish({ ...native, appearance: 'invalid' });
        expect(getAppearancePreference()).toBe('dark');
    });

    it('accepts child storage changes before runtime broadcasts without restoring the old selection', () => {
        release = installPreferences();
        setLanguagePreference('en');
        window.localStorage.setItem('rmg-runtime__language', 'ja');
        window.dispatchEvent(
            new StorageEvent('storage', {
                key: 'rmg-runtime__language',
                newValue: 'ja',
                storageArea: window.localStorage,
            })
        );
        expect(getLanguagePreference()).toBe('ja');
        expect(i18n.language).toBe('ja');
        expect(rmgRuntime.getLanguage()).toBe('ja');
        expect(postMessage).toHaveBeenLastCalledWith({ type: 'set', language: 'ja' });
    });

    it('ignores native bridges and snapshots outside the AppStore instance', () => {
        vi.mocked(rmgRuntime.getInstance).mockReturnValue('GitHub');
        Object.defineProperty(window, '__RMT_NATIVE_PREFERENCES__', { configurable: true, value: native });
        release = installPreferences();
        expect(i18n.language).toBe('en');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('light');

        publish({ ...native, appearance: 'dark', language: 'ja' });
        expect(i18n.language).toBe('en');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('light');

        setAppearancePreference('dark');
        setLanguagePreference('ko');
        window.dispatchEvent(new Event('focus'));
        expect(getAppearancePreference()).toBe('dark');
        expect(i18n.language).toBe('ko');
        expect(postMessage).not.toHaveBeenCalled();
    });

    it('keeps web preferences working in AppStore when no native Settings bridge is available', () => {
        Reflect.deleteProperty(window, 'webkit');
        release = installPreferences();
        setAppearancePreference('dark');
        setLanguagePreference('ja');
        expect(document.documentElement.dataset.mantineColorScheme).toBe('dark');
        expect(i18n.language).toBe('ja');
        expect(postMessage).not.toHaveBeenCalled();
    });
});
