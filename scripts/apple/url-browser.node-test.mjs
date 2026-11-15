import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM, VirtualConsole } from 'jsdom';

const adapter = await readFile(new URL('../../tauri/src/apple-browser.js', import.meta.url), 'utf8');
const exportAdapter = await readFile(new URL('../../tauri/src/apple-export.js', import.meta.url), 'utf8');
const command = 'open_url';

function setup(url = 'tauri://localhost/index.html', respond) {
    const dom = new JSDOM('<html><body></body></html>', {
        url,
        runScripts: 'outside-only',
        virtualConsole: new VirtualConsole(),
    });
    const { window } = dom;
    const calls = [];
    const opens = [];
    const errors = [];
    const opened = {};
    window.__TAURI__ = {
        core: {
            invoke: async (name, payload) => {
                calls.push({ name, url: payload.url });
                return respond?.(name, payload);
            },
        },
    };
    window.console.error = (...args) => errors.push(args);
    const install = (frame = window) => {
        frame.open = function (...args) {
            opens.push({ frame, receiver: this, args });
            return opened;
        };
        frame.eval(adapter);
    };
    const anchor = (href, frame = window) => {
        const link = frame.document.createElement('a');
        link.href = href;
        return link;
    };
    const click = (element, options = {}) => {
        const event = new element.ownerDocument.defaultView.MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            composed: true,
            ...options,
        });
        element.dispatchEvent(event);
        return event;
    };
    const settle = () => new Promise(resolve => setImmediate(resolve));
    return { window, calls, opens, errors, opened, install, anchor, click, settle, close: () => window.close() };
}

test('opens external HTTP(S) URLs natively for every window.open target and resolves protocol-relative URLs', async () => {
    const page = setup('https://tauri.localhost/rmp/');
    try {
        page.install();
        for (const args of [
            ['https://example.com/docs'],
            ['http://example.com/help', '_blank'],
            ['//example.com/account', '_self'],
            ['https://example.com/status', 'named-window', 'noopener'],
        ])
            assert.equal(page.window.open(...args), null);
        await page.settle();
        assert.deepEqual(page.calls, [
            { name: command, url: 'https://example.com/docs' },
            { name: command, url: 'http://example.com/help' },
            { name: command, url: 'https://example.com/account' },
            { name: command, url: 'https://example.com/status' },
        ]);
        assert.equal(page.opens.length, 0);
    } finally {
        page.close();
    }
});

test('preserves internal routes, empty windows, non-web URLs, arguments and original window.open receiver', () => {
    const page = setup('https://tauri.localhost/rmp/');
    try {
        page.install();
        const variants = [
            [],
            ['', '_blank'],
            ['/rmp-designer/#/new', '_blank', 'width=500'],
            ['#settings', '_self'],
            ['https://tauri.localhost/rmp-gallery/', 'gallery'],
            ['http://tauri.localhost:3000/rmp/', '_self'],
            ['blob:https://tauri.localhost/export', '_blank'],
            ['data:text/plain,export', '_blank'],
            ['mailto:support@example.com'],
        ];
        for (const args of variants) assert.equal(page.window.open(...args), page.opened);
        assert.equal(page.calls.length, 0);
        assert.deepEqual(
            page.opens.map(open => open.args),
            variants
        );
        assert.ok(page.opens.every(open => open.receiver === page.window));
    } finally {
        page.close();
    }
});

test('handles nested and shadow link clicks and detached anchor.click exactly once after repeated installation', async () => {
    const page = setup();
    try {
        page.install();
        page.window.eval(adapter);
        const link = page.anchor('https://example.com/nested');
        const label = page.window.document.createElement('span');
        link.append(label);
        page.window.document.body.append(link);
        assert.equal(page.click(label).defaultPrevented, true);

        const host = page.window.document.createElement('div');
        page.window.document.body.append(host);
        const shadow = host.attachShadow({ mode: 'open' });
        const shadowLink = page.anchor('https://example.com/shadow');
        const shadowLabel = page.window.document.createElement('span');
        shadowLink.append(shadowLabel);
        shadow.append(shadowLink);
        assert.equal(page.click(shadowLabel).defaultPrevented, true);

        let normalClickListeners = 0;
        const detached = page.anchor('https://example.com/detached');
        detached.addEventListener('click', () => normalClickListeners++);
        detached.click();
        await page.settle();
        assert.equal(normalClickListeners, 1);
        assert.deepEqual(page.calls, [
            { name: command, url: 'https://example.com/nested' },
            { name: command, url: 'https://example.com/shadow' },
            { name: command, url: 'https://example.com/detached' },
        ]);
    } finally {
        page.close();
    }
});

test('keeps downloads, internal navigation and already-cancelled clicks outside the browser bridge', async () => {
    const page = setup('https://tauri.localhost/rmp-gallery/');
    try {
        page.install();
        for (const href of [
            '/rmp/#/project',
            '#details',
            '/rmp-gallery/resources/real_world/map.json',
            'blob:https://tauri.localhost/export',
            'data:application/json,%7B%7D',
            'mailto:support@example.com',
        ]) {
            const link = page.anchor(href);
            page.window.document.body.append(link);
            assert.equal(page.click(link).defaultPrevented, false, href);
        }
        const download = page.anchor('https://example.com/archive.zip');
        download.setAttribute('download', '');
        page.window.document.body.append(download);
        assert.equal(page.click(download).defaultPrevented, false);
        download.click();

        const cancelled = page.anchor('https://example.com/cancelled');
        page.window.document.body.append(cancelled);
        const event = new page.window.MouseEvent('click', { bubbles: true, cancelable: true });
        event.preventDefault();
        cancelled.dispatchEvent(event);

        for (const connected of [false, true]) {
            const handled = page.anchor('https://example.com/handled');
            handled.addEventListener('click', event => event.preventDefault());
            if (connected) page.window.document.body.append(handled);
            handled.click();
        }
        await page.settle();
        assert.equal(page.calls.length, 0);
    } finally {
        page.close();
    }
});

test('native file exports and external links coexist regardless of adapter installation order', async () => {
    for (const exportFirst of [false, true]) {
        const page = setup('https://tauri.localhost/', name => {
            if (name === 'begin_file_export') return 'test-export';
            if (name === 'finish_file_export') return { status: 'completed' };
        });
        try {
            page.window.fetch = fetch;
            if (exportFirst) page.window.eval(exportAdapter);
            page.install();
            if (!exportFirst) page.window.eval(exportAdapter);

            const download = page.anchor('data:application/json,%7B%22name%22%3A%22map%22%7D');
            download.download = 'map.json';
            download.click();
            const link = page.anchor('https://example.com/docs');
            page.window.document.body.append(link);
            assert.equal(page.click(link).defaultPrevented, true);

            for (let attempt = 0; attempt < 100; attempt++) {
                if (page.calls.some(call => call.name === 'finish_file_export')) break;
                await new Promise(resolve => setTimeout(resolve, 5));
            }
            assert.deepEqual(
                page.calls.filter(call => call.name !== command).map(call => call.name),
                ['begin_file_export', 'append_file_export', 'finish_file_export']
            );
            assert.deepEqual(
                page.calls.filter(call => call.name === command),
                [{ name: command, url: 'https://example.com/docs' }]
            );
            assert.equal(page.errors.length, 0);
        } finally {
            page.close();
        }
    }
});

test('same-origin child applications invoke the top-level native bridge without a frame-local Tauri API', async () => {
    const page = setup('https://tauri.localhost/index.html');
    try {
        page.install();
        const iframe = page.window.document.createElement('iframe');
        iframe.src = 'https://tauri.localhost/rmp/';
        page.window.document.body.append(iframe);
        const frame = iframe.contentWindow;
        assert.equal(frame.__TAURI__, undefined);
        page.install(frame);
        frame.open('https://example.com/from-rmp', '_blank');
        const link = page.anchor('https://example.com/child-link', frame);
        frame.document.append(frame.document.createElement('html'));
        frame.document.documentElement.append(link);
        assert.equal(page.click(link).defaultPrevented, true);
        await page.settle();
        assert.deepEqual(page.calls, [
            { name: command, url: 'https://example.com/from-rmp' },
            { name: command, url: 'https://example.com/child-link' },
        ]);
        assert.equal(page.opens.length, 0);
    } finally {
        page.close();
    }
});

test('remote pages and cross-origin descendants never acquire the native URL bridge', async () => {
    const remote = setup('https://railmapgen.org/');
    const local = setup('https://tauri.localhost/');
    try {
        remote.install();
        assert.equal(remote.window.open('https://example.com/'), remote.opened);
        const iframe = local.window.document.createElement('iframe');
        iframe.src = 'https://example.com/remote-frame';
        local.window.document.body.append(iframe);
        local.install(iframe.contentWindow);
        assert.equal(iframe.contentWindow.open('https://example.com/'), local.opened);
        await remote.settle();
        await local.settle();
        assert.equal(remote.calls.length, 0);
        assert.equal(local.calls.length, 0);
    } finally {
        remote.close();
        local.close();
    }
});

test('reports native presentation failures without falling back to an external window or rejecting unhandled', async () => {
    const failure = new Error('The application window is not attached');
    const page = setup('tauri://localhost/index.html', () => Promise.reject(failure));
    try {
        page.install();
        assert.equal(page.window.open('https://example.com/'), null);
        await page.settle();
        assert.equal(page.calls.length, 1);
        assert.equal(page.opens.length, 0);
        assert.equal(page.errors.length, 1);
        assert.ok(page.errors[0].some(value => value === failure || String(value).includes(failure.message)));
    } finally {
        page.close();
    }
});
