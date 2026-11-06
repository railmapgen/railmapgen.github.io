// Installed at document start in every Apple webview frame, before application code.
(() => {
    let host;
    try {
        host = window.top;
        // Reading the document also rejects sandboxed and cross-origin descendants.
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
    if (window.__RMT_APPLE_EXPORT_INSTALLED__) return;
    Object.defineProperty(window, '__RMT_APPLE_EXPORT_INSTALLED__', { value: true });

    const chunkSize = 1024 * 1024;
    const sameOrigin = url => url.protocol === host.location.protocol && url.host === host.location.host;
    const invoke = (...args) => {
        const core = host.__TAURI__?.core;
        if (!core?.invoke) return Promise.reject(new Error('Native file export is unavailable.'));
        return core.invoke(...args);
    };

    if (!host.__RMT_APPLE_EXPORT__) {
        const reportFailure = async error => {
            const message = error?.message || String(error);
            try {
                await invoke('show_file_export_error', { message });
            } catch (dialogError) {
                host.console.error('File export failed:', error, dialogError);
            }
        };
        const transfer = async (source, filename) => {
            let exportId;
            try {
                const blob = await source;
                exportId = await invoke('begin_file_export', {
                    filename,
                    mimeType: blob.type || 'application/octet-stream',
                });
                for (let offset = 0; offset < blob.size; offset += chunkSize) {
                    const chunk = new Uint8Array(await blob.slice(offset, offset + chunkSize).arrayBuffer());
                    await invoke('append_file_export', chunk, { headers: { 'x-rmt-export-id': exportId } });
                }
                await invoke('finish_file_export', { exportId });
            } catch (error) {
                if (exportId !== undefined) {
                    try {
                        await invoke('abort_file_export', { exportId });
                    } catch (abortError) {
                        host.console.error('Could not remove failed export:', abortError);
                    }
                }
                await reportFailure(error);
            }
        };
        let queue = Promise.resolve();
        const exportBlob = (source, filename) => {
            const pending = Promise.resolve(source);
            // URL reads start during click capture. A queued read can fail before
            // its turn; retain the rejection for transfer() without an unhandled
            // rejection while an earlier native sheet is still visible.
            pending.catch(() => {});
            const next = queue.then(() => transfer(pending, filename));
            queue = next.catch(() => {});
            return next;
        };
        Object.defineProperty(host, '__RMT_APPLE_EXPORT__', { value: Object.freeze({ exportBlob }) });
    }

    // Many existing exporters revoke the URL immediately after click(). Retain the
    // Blob synchronously, without loading an entire large export into a JS array.
    const blobs = new Map();
    const createObjectURL = window.URL.createObjectURL;
    const revokeObjectURL = window.URL.revokeObjectURL;
    if (createObjectURL) {
        window.URL.createObjectURL = function (value) {
            const url = createObjectURL.call(this, value);
            if (typeof value?.slice === 'function' && typeof value.size === 'number') blobs.set(url, value);
            return url;
        };
    }
    if (revokeObjectURL) {
        window.URL.revokeObjectURL = function (url) {
            blobs.delete(String(url));
            return revokeObjectURL.call(this, url);
        };
    }

    const filenameFor = (anchor, url, blob) => {
        if (anchor.download) return anchor.download;
        if (url.protocol !== 'blob:' && url.protocol !== 'data:') {
            try {
                const name = decodeURIComponent(url.pathname.split('/').pop());
                if (name) return name;
            } catch {
                // An invalid escape should not prevent exporting the file itself.
            }
        }
        const type = blob?.type || (url.protocol === 'data:' ? url.href.slice(5).split(/[;,]/)[0] : '');
        const extension = {
            'application/json': 'json',
            'application/zip': 'zip',
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/svg+xml': 'svg',
            'text/plain': 'txt',
            'video/mp4': 'mp4',
            'video/webm': 'webm',
        }[type.split(';')[0]];
        return extension ? `export.${extension}` : 'export';
    };

    const handledEvents = new WeakSet();
    const intercept = (event, anchor) => {
        if (handledEvents.has(event) || event.defaultPrevented || !anchor?.getAttribute('href')) return;
        let url;
        try {
            url = new URL(anchor.href, document.baseURI);
        } catch {
            return;
        }
        const galleryDownload =
            sameOrigin(url) && /^\/rmp-gallery\/resources\/(?:real_world|fantasy)\/[^/]+\.json$/.test(url.pathname);
        if (!anchor.hasAttribute('download') && !galleryDownload) return;
        const blob = blobs.get(url.href);
        if (!blob && url.protocol !== 'data:' && !sameOrigin(url)) {
            // A Blob URL may have been created in a different same-origin frame.
            if (url.protocol !== 'blob:') return;
            try {
                if (!sameOrigin(new URL(url.pathname))) return;
            } catch {
                return;
            }
        }
        handledEvents.add(event);
        event.preventDefault();
        let source;
        try {
            // Start fetching before the exporter can revoke its object URL.
            source =
                blob ||
                window.fetch(url.href).then(response => {
                    if (!response.ok) throw new Error(`Could not read export file (${response.status}).`);
                    return response.blob();
                });
        } catch (error) {
            source = Promise.reject(error);
        }
        void host.__RMT_APPLE_EXPORT__.exportBlob(source, filenameFor(anchor, url, blob));
    };

    document.addEventListener(
        'click',
        event => {
            const anchor = event.composedPath().find(node => node?.localName === 'a');
            intercept(event, anchor);
        },
        true
    );
    const click = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () {
        // A detached anchor does not bubble to document. Keep its ordinary click
        // listeners, while sharing the event guard with the document listener.
        const listener = event => intercept(event, this);
        this.addEventListener('click', listener, true);
        try {
            return click.call(this);
        } finally {
            this.removeEventListener('click', listener, true);
        }
    };
})();
