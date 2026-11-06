import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const adapter = await readFile(new URL('../../tauri/src/apple-export.js', import.meta.url), 'utf8');
const chunkSize = 1024 * 1024;

function setup(url = 'tauri://localhost/index.html', respond) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error));
    const dom = new JSDOM('<html><body></body></html>', { url, runScripts: 'outside-only', virtualConsole });
    const { window } = dom;
    const calls = [];
    let serial = 0;
    window.__TAURI__ = {
        core: {
            invoke: async (command, payload, options) => {
                calls.push({ command, payload, options });
                if (respond) {
                    const response = await respond(command, payload, options);
                    if (response !== undefined) return response;
                }
                if (command === 'begin_file_export') return `export-${++serial}`;
                if (command === 'finish_file_export') return { status: 'completed' };
            },
        },
    };
    const install = (frame = window) => {
        let nextUrl = 0;
        frame.URL.createObjectURL = () => `blob:${window.location.protocol}//${window.location.host}/${++nextUrl}`;
        frame.URL.revokeObjectURL = () => {};
        frame.fetch = fetch;
        frame.eval(adapter);
    };
    const waitFor = async (command, count = 1) => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (calls.filter(call => call.command === command).length >= count) return;
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        assert.fail(`Timed out waiting for ${count} ${command} calls: ${calls.map(call => call.command)}`);
    };
    const anchor = (frame, href, filename) => {
        const link = frame.document.createElement('a');
        link.href = href;
        if (filename !== undefined) link.download = filename;
        return link;
    };
    return { window, calls, errors, install, waitFor, anchor, close: () => window.close() };
}

test('retains immediately revoked Blob exports and transfers binary chunks without JSON byte arrays', async () => {
    const page = setup();
    try {
        page.install();
        const bytes = new Uint8Array(chunkSize * 2 + 17);
        bytes.fill(145);
        bytes[bytes.length - 1] = 87;
        const blob = new Blob([bytes], { type: 'image/png' });
        const url = page.window.URL.createObjectURL(blob);
        const link = page.anchor(page.window, url, '线路图 🌏.png');
        page.window.document.body.append(link);
        link.click();
        link.remove();
        page.window.URL.revokeObjectURL(url);
        await page.waitFor('finish_file_export');
        const begin = page.calls.find(call => call.command === 'begin_file_export');
        assert.deepEqual({ ...begin.payload }, { filename: '线路图 🌏.png', mimeType: 'image/png' });
        const chunks = page.calls.filter(call => call.command === 'append_file_export');
        assert.deepEqual(
            chunks.map(call => call.payload.byteLength),
            [chunkSize, chunkSize, 17]
        );
        for (const chunk of chunks) {
            assert.equal(ArrayBuffer.isView(chunk.payload), true);
            assert.equal(Array.isArray(chunk.payload), false);
            assert.equal(chunk.options.headers['x-rmt-export-id'], 'export-1');
        }
        assert.equal(chunks[2].payload[16], 87);
        assert.equal(page.calls.filter(call => call.command === 'begin_file_export').length, 1);
        assert.equal(page.errors.length, 0);
    } finally {
        page.close();
    }
});

test('handles detached anchors, data URLs, empty files and idempotent installation', async () => {
    const page = setup('https://tauri.localhost/');
    try {
        page.install();
        page.window.eval(adapter);
        let ordinaryClicks = 0;
        const link = page.anchor(
            page.window,
            'data:application/json,%7B%22name%22%3A%22%E5%9C%B0%E5%9B%BE%22%7D',
            '地图.json'
        );
        link.addEventListener('click', () => ordinaryClicks++);
        link.click();
        await page.waitFor('finish_file_export');
        const firstChunk = page.calls.find(call => call.command === 'append_file_export');
        assert.equal(new TextDecoder().decode(firstChunk.payload), '{"name":"地图"}');
        const emptyUrl = page.window.URL.createObjectURL(new Blob([], { type: 'text/plain' }));
        page.anchor(page.window, emptyUrl, 'empty.txt').click();
        page.window.URL.revokeObjectURL(emptyUrl);
        await page.waitFor('finish_file_export', 2);
        assert.equal(ordinaryClicks, 1);
        assert.equal(page.calls.filter(call => call.command === 'begin_file_export').length, 2);
        assert.equal(page.calls.filter(call => call.command === 'append_file_export').length, 1);
        assert.equal(page.errors.length, 0);
    } finally {
        page.close();
    }
});

test('exports a real nested-target click and the Gallery JSON link without intercepting ordinary navigation', async () => {
    const page = setup('https://tauri.localhost/rmp-gallery/');
    try {
        page.install();
        const requests = [];
        page.window.fetch = async href => {
            requests.push(href);
            return new Response('{"city":"上海"}', { headers: { 'Content-Type': 'application/json' } });
        };
        const link = page.anchor(page.window, 'resources/real_world/%E4%B8%8A%E6%B5%B7.json');
        link.target = '_blank';
        link.innerHTML = '<span>Download</span>';
        page.window.document.body.append(link);
        const event = new page.window.MouseEvent('click', { bubbles: true, cancelable: true });
        assert.equal(link.firstChild.dispatchEvent(event), false);
        await page.waitFor('finish_file_export');
        assert.equal(page.calls[0].payload.filename, '上海.json');
        assert.deepEqual(requests, [
            'https://tauri.localhost/rmp-gallery/resources/real_world/%E4%B8%8A%E6%B5%B7.json',
        ]);
        const navigate = page.anchor(page.window, '/rmp/');
        page.window.document.body.append(navigate);
        const navigation = new page.window.MouseEvent('click', { bubbles: true, cancelable: true });
        navigate.addEventListener('click', event => event.preventDefault());
        navigate.dispatchEvent(navigation);
        assert.equal(requests.length, 1);
        assert.equal(page.calls.length, 3);
    } finally {
        page.close();
    }
});

test('routes iframe Blob references through the top-level bridge and accepts same-origin file download links', async () => {
    const page = setup('https://tauri.localhost/');
    try {
        page.install();
        const iframe = page.window.document.createElement('iframe');
        iframe.src = '/rma/';
        page.window.document.body.append(iframe);
        const child = iframe.contentWindow;
        page.install(child);
        const url = child.URL.createObjectURL(new Blob(['audio text'], { type: 'text/plain' }));
        page.anchor(child, url, 'RMA.txt').click();
        child.URL.revokeObjectURL(url);
        await page.waitFor('finish_file_export');
        child.fetch = async href => {
            assert.equal(href, 'https://tauri.localhost/resources/save.json');
            return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
        };
        page.anchor(child, '/resources/save.json', '').click();
        await page.waitFor('finish_file_export', 2);
        assert.deepEqual(
            page.calls.filter(call => call.command === 'begin_file_export').map(call => call.payload.filename),
            ['RMA.txt', 'save.json']
        );
        assert.equal(child.__RMT_APPLE_EXPORT__, undefined);
        assert.equal(page.errors.length, 0);
    } finally {
        page.close();
    }
});

test('starts reading unregistered same-origin Blob URLs before immediate revocation', async () => {
    const page = setup('https://tauri.localhost/');
    try {
        page.install();
        let revoked = false;
        let started = false;
        page.window.fetch = href => {
            assert.equal(href, 'blob:https://tauri.localhost/created-in-another-frame');
            assert.equal(revoked, false);
            started = true;
            return Promise.resolve(new Response('shared', { headers: { 'Content-Type': 'text/plain' } }));
        };
        const url = 'blob:https://tauri.localhost/created-in-another-frame';
        page.anchor(page.window, url, 'shared.txt').click();
        page.window.URL.revokeObjectURL(url);
        revoked = true;
        assert.equal(started, true);
        await page.waitFor('finish_file_export');
        const chunk = page.calls.find(call => call.command === 'append_file_export');
        assert.equal(new TextDecoder().decode(chunk.payload), 'shared');
    } finally {
        page.close();
    }
});

test('uploads and presents a large first export before a small later export, including cancellation', async () => {
    let releaseFirst;
    const firstPresented = new Promise(resolve => {
        releaseFirst = resolve;
    });
    const page = setup('tauri://localhost/', (command, payload) => {
        if (command === 'finish_file_export' && payload.exportId === 'export-1') return firstPresented;
    });
    try {
        page.install();
        for (const [name, data, type] of [
            ['first.mp4', new Uint8Array(chunkSize * 2 + 17), 'video/mp4'],
            ['second.json', '{"two":2}', 'application/json'],
        ]) {
            const url = page.window.URL.createObjectURL(new Blob([data], { type }));
            page.anchor(page.window, url, name).click();
            page.window.URL.revokeObjectURL(url);
        }
        await page.waitFor('finish_file_export');
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.deepEqual(
            page.calls.filter(call => call.command === 'begin_file_export').map(call => call.payload.filename),
            ['first.mp4']
        );
        const firstChunks = page.calls.filter(call => call.command === 'append_file_export');
        assert.deepEqual(
            firstChunks.map(call => call.payload.byteLength),
            [chunkSize, chunkSize, 17]
        );
        assert.equal(
            firstChunks.every(call => call.options.headers['x-rmt-export-id'] === 'export-1'),
            true
        );
        releaseFirst({ status: 'cancelled' });
        await page.waitFor('finish_file_export', 2);
        const secondChunk = page.calls.find(
            call => call.command === 'append_file_export' && call.options.headers['x-rmt-export-id'] === 'export-2'
        );
        assert.equal(new TextDecoder().decode(secondChunk.payload), '{"two":2}');
        assert.deepEqual(
            page.calls.filter(call => call.command === 'finish_file_export').map(call => call.payload.exportId),
            ['export-1', 'export-2']
        );
        assert.deepEqual(
            page.calls.filter(call => call.command === 'begin_file_export').map(call => call.payload.filename),
            ['first.mp4', 'second.json']
        );
    } finally {
        releaseFirst({ status: 'cancelled' });
        page.close();
    }
});

test('leaves remote pages and remote iframe descendants untouched', () => {
    const remote = setup('https://railmapgen.org/');
    const page = setup('https://tauri.localhost/');
    try {
        const originalRemoteClick = remote.window.HTMLAnchorElement.prototype.click;
        remote.install();
        assert.equal(remote.window.HTMLAnchorElement.prototype.click, originalRemoteClick);
        assert.equal(remote.window.__RMT_APPLE_EXPORT_INSTALLED__, undefined);
        page.install();
        const iframe = page.window.document.createElement('iframe');
        iframe.src = 'https://example.org/';
        page.window.document.body.append(iframe);
        const child = iframe.contentWindow;
        const originalChildClick = child.HTMLAnchorElement.prototype.click;
        page.install(child);
        assert.equal(child.HTMLAnchorElement.prototype.click, originalChildClick);
        assert.equal(child.__RMT_APPLE_EXPORT_INSTALLED__, undefined);
        assert.equal(page.calls.length, 0);
        assert.equal(remote.calls.length, 0);
    } finally {
        remote.close();
        page.close();
    }
});

test('aborts failed transfers, reports errors, and continues handling subsequent exports', async () => {
    let rejectChunk = true;
    let releaseError;
    const errorPresented = new Promise(resolve => {
        releaseError = resolve;
    });
    const page = setup('tauri://localhost/', command => {
        if (command === 'append_file_export' && rejectChunk) {
            rejectChunk = false;
            throw new Error('Disk is full');
        }
        if (command === 'show_file_export_error') return errorPresented;
    });
    try {
        page.install();
        const url = page.window.URL.createObjectURL(new Blob(['test'], { type: 'application/json' }));
        page.anchor(page.window, url, 'save.json').click();
        page.anchor(page.window, url, 'retry.json').click();
        page.window.URL.revokeObjectURL(url);
        await page.waitFor('show_file_export_error');
        const aborted = page.calls.find(call => call.command === 'abort_file_export');
        assert.equal(aborted.payload.exportId, 'export-1');
        const dialog = page.calls.find(call => call.command === 'show_file_export_error');
        assert.deepEqual({ ...dialog.payload }, { message: 'Disk is full' });
        assert.equal(
            page.calls.some(call => call.command === 'finish_file_export'),
            false
        );
        assert.equal(page.calls.filter(call => call.command === 'begin_file_export').length, 1);
        releaseError();
        await page.waitFor('finish_file_export');
        assert.equal(page.calls.filter(call => call.command === 'begin_file_export').length, 2);
        assert.deepEqual(
            page.calls.map(call => call.command),
            [
                'begin_file_export',
                'append_file_export',
                'abort_file_export',
                'show_file_export_error',
                'begin_file_export',
                'append_file_export',
                'finish_file_export',
            ]
        );
    } finally {
        releaseError();
        page.close();
    }
});

test('retains queued source-read failures without an unhandled rejection while an earlier sheet is open', async () => {
    let releaseFirst;
    const firstPresented = new Promise(resolve => {
        releaseFirst = resolve;
    });
    const page = setup('tauri://localhost/', command => {
        if (command === 'finish_file_export') return firstPresented;
    });
    try {
        page.install();
        const url = page.window.URL.createObjectURL(new Blob(['first']));
        page.anchor(page.window, url, 'first.txt').click();
        await page.waitFor('finish_file_export');
        page.window.fetch = async () => {
            throw new Error('Queued resource could not be read');
        };
        page.anchor(page.window, '/second.json', 'second.json').click();
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(
            page.calls.some(call => call.command === 'show_file_export_error'),
            false
        );
        releaseFirst({ status: 'completed' });
        await page.waitFor('show_file_export_error');
        assert.equal(page.calls.at(-1).payload.message, 'Queued resource could not be read');
        assert.equal(page.calls.filter(call => call.command === 'begin_file_export').length, 1);
    } finally {
        releaseFirst({ status: 'cancelled' });
        page.close();
    }
});

test('cancelled native presentation completes quietly, and source-read errors are visible', async () => {
    const page = setup('tauri://localhost/', command => {
        if (command === 'finish_file_export') return { status: 'cancelled' };
    });
    try {
        page.install();
        const url = page.window.URL.createObjectURL(new Blob(['ok']));
        page.anchor(page.window, url, 'cancel.txt').click();
        await page.waitFor('finish_file_export');
        assert.equal(
            page.calls.some(call => call.command === 'abort_file_export'),
            false
        );
        assert.equal(
            page.calls.some(call => call.command === 'show_file_export_error'),
            false
        );
        page.window.fetch = async () => new Response('missing', { status: 404 });
        page.anchor(page.window, '/missing.json', 'missing.json').click();
        await page.waitFor('show_file_export_error');
        assert.match(page.calls.at(-1).payload.message, /404/);
        assert.equal(page.calls.filter(call => call.command === 'begin_file_export').length, 1);
    } finally {
        page.close();
    }
});

// Child application layout and shared viewport behavior.
const layoutAdapter = await readFile(new URL('./edge-to-edge.js', import.meta.url), 'utf8');
const stylesheet = await readFile(new URL('./edge-to-edge.css', import.meta.url), 'utf8');

function setupLayout() {
    const dom = new JSDOM(
        `<html class="rmt-native-edge-to-edge" data-rmt-component="rmp"
          style="--rmt-host-menu-right:40px">
        <head></head><body><div class="rmg-window">
          <div id="header" class="rmg-window__header" style="margin-left:40px"></div>
          <div class="rmg-window rm-window--is-app-clip"><div id="nested-header" class="rmg-window__header"></div>
            <div id="nested-footer" class="rmg-page__footer"></div></div>
          <div id="footer" class="rmg-page__footer"></div>
          <div id="offscreen-footer" class="rmg-page__footer"></div>
          <div class="mantine-Modal-root" data-full-screen><div id="modal-inner" class="mantine-Modal-inner" style="padding:0">
            <div class="mantine-Modal-content"><div class="mantine-Modal-header"></div></div></div></div>
        </div></body></html>`,
        { pretendToBeVisual: true, runScripts: 'outside-only' }
    );
    const { window } = dom;
    const style = window.document.createElement('style');
    style.textContent = stylesheet;
    window.document.head.append(style);
    Object.defineProperties(window, { innerWidth: { value: 844 }, innerHeight: { value: 390 } });
    const observers = [];
    const OriginalObserver = window.MutationObserver;
    window.MutationObserver = class extends OriginalObserver {
        constructor(callback) {
            super(callback);
            observers.push(this);
        }
    };
    let scheduled = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
        scheduled++;
        return raf(callback);
    };
    const tick = async () => {
        await new Promise(resolve => raf(resolve));
        await new Promise(resolve => raf(resolve));
    };
    const box = (id, left, top, width, height) => {
        const element = window.document.getElementById(id);
        element.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height });
        return element;
    };
    const close = () => {
        for (const observer of observers) observer.disconnect();
        window.close();
    };
    return { window, box, close, tick, scheduled: () => scheduled };
}

test('children fill the shared viewport without physical control padding and settle observer writes', async () => {
    const page = setupLayout();
    try {
        const header = page.box('header', 40, 0, 804, 40);
        const nestedHeader = page.box('nested-header', 100, 100, 200, 40);
        const nestedFooter = page.box('nested-footer', 100, 200, 200, 40);
        const footer = page.box('footer', 0, 350, 844, 40);
        const offscreenFooter = page.box('offscreen-footer', 0, 450, 844, 200);
        page.window.eval(layoutAdapter);
        await page.tick();
        for (const edge of ['top', 'right', 'bottom', 'left'])
            assert.equal(
                page.window
                    .getComputedStyle(page.window.document.documentElement)
                    .getPropertyValue(`--rmt-safe-area-${edge}`),
                '0px'
            );
        assert.equal(header.style.getPropertyValue('--rmt-control-safe-left'), '0px');
        assert.equal(nestedHeader.style.getPropertyValue('--rmt-control-safe-left'), '0px');
        assert.equal(nestedFooter.style.getPropertyValue('--rmt-control-safe-bottom'), '');
        assert.equal(footer.style.getPropertyValue('--rmt-control-safe-bottom'), '');
        assert.equal(offscreenFooter.style.getPropertyValue('--rmt-control-safe-bottom'), '');
        assert.equal(page.window.getComputedStyle(page.window.document.getElementById('modal-inner')).padding, '0px');
        assert.equal(nestedHeader.hasAttribute('data-rmt-screen-header'), false);
        assert.equal(nestedHeader.hasAttribute('data-rmt-nested-header'), true);
        const count = page.scheduled();
        await page.tick();
        assert.equal(page.scheduled(), count, 'unchanged geometry must not keep scheduling itself');
    } finally {
        page.close();
    }
});

test('runtime menu margin changes refresh header geometry and hidden controls never emit nonfinite values', async () => {
    const page = setupLayout();
    try {
        const header = page.box('header', 40, 0, 804, 40);
        page.window.eval(layoutAdapter);
        await page.tick();
        assert.equal(header.style.getPropertyValue('--rmt-control-safe-left'), '0px');
        page.box('header', 0, 0, 844, 40);
        header.style.marginLeft = '0px';
        await page.tick();
        assert.equal(header.style.getPropertyValue('--rmt-control-safe-left'), '40px');
        assert.equal(header.style.getPropertyValue('--rmt-header-slot-left'), '0px');
        page.box('header', 0, 0, 0, 0);
        header.classList.add('hidden');
        await page.tick();
        assert.equal(header.style.getPropertyValue('--rmt-control-safe-left'), '0px');
        assert.doesNotMatch(header.style.cssText, /NaN|Infinity/);
    } finally {
        page.close();
    }
});

test('a shifted host menu reserves its measured right edge only in the outer screen header', async () => {
    const page = setupLayout();
    try {
        const root = page.window.document.documentElement;
        root.style.setProperty('--rmt-safe-area-left', '32px');
        root.style.setProperty('--rmt-host-menu-right', '72px');
        const header = page.box('header', 40, 0, 804, 105);
        const nested = page.box('nested-header', 40, 105, 200, 40);
        page.window.eval(layoutAdapter);
        await page.tick();
        assert.equal(header.style.getPropertyValue('--rmt-control-safe-left'), '32px');
        assert.equal(nested.style.getPropertyValue('--rmt-control-safe-left'), '0px');
        assert.equal(header.style.getPropertyValue('--rmt-header-slot-left'), '40px');

        root.style.setProperty('--rmt-host-menu-right', '0px');
        await page.tick();
        assert.equal(header.style.getPropertyValue('--rmt-control-safe-left'), '0px');
        page.box('header', 0, 0, 844, 105);
        header.style.marginLeft = '0px';
        await page.tick();
        assert.equal(header.style.getPropertyValue('--rmt-control-safe-left'), '0px');
        const count = page.scheduled();
        await page.tick();
        assert.equal(page.scheduled(), count);
    } finally {
        page.close();
    }
});
