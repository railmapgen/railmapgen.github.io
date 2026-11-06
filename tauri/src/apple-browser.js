// Installed at document start in every iOS frame, including bundled child apps.
(() => {
    let host;
    try {
        host = window.top;
        // Reject cross-origin and sandboxed frames before exposing a native path.
        if (!host.document) return;
        const { protocol, hostname } = host.location;
        const local =
            (protocol === 'tauri:' && hostname === 'localhost') ||
            ((protocol === 'http:' || protocol === 'https:') && hostname === 'tauri.localhost');
        if (!local) return;
        if (
            window !== host &&
            window.location.protocol !== 'about:' &&
            (window.location.protocol !== protocol || window.location.host !== host.location.host)
        )
            return;
    } catch {
        return;
    }
    if (window.__RMT_IOS_BROWSER_INSTALLED__) return;
    Object.defineProperty(window, '__RMT_IOS_BROWSER_INSTALLED__', { value: true });

    const externalURL = value => {
        try {
            const url = new URL(value, document.baseURI);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
            if (url.hostname === 'tauri.localhost') return;
            return url;
        } catch {
            return;
        }
    };
    const open = async url => {
        try {
            const core = host.__TAURI__?.core;
            if (!core?.invoke) throw new Error('The native browser is unavailable.');
            await core.invoke('open_url', { url: url.href });
        } catch (error) {
            host.console.error('Could not open the native browser:', error);
        }
    };

    const windowOpen = window.open;
    window.open = function (...args) {
        const external = externalURL(args[0]);
        if (!external) return windowOpen.apply(this, args);
        void open(external);
        // A native controller has no script-accessible WindowProxy.
        return null;
    };

    const intercept = (event, anchor) => {
        if (event.defaultPrevented || event.button !== 0 || !anchor?.getAttribute('href')) return;
        if (anchor.hasAttribute('download')) return;
        const url = externalURL(anchor.href);
        if (!url) return;
        event.preventDefault();
        void open(url);
    };
    // Bubble after application click handlers so a cancelled link stays cancelled.
    document.addEventListener('click', event => {
        const anchor = event.composedPath().find(node => node?.localName === 'a');
        intercept(event, anchor);
    });

    const click = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () {
        if (this.isConnected) return click.call(this);
        // Detached links do not reach document; preserve their own click handlers.
        const listener = event => intercept(event, this);
        this.addEventListener('click', listener);
        try {
            return click.call(this);
        } finally {
            this.removeEventListener('click', listener);
        }
    };
})();
