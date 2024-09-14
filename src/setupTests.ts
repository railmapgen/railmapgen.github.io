import { TextEncoder } from 'util';
import crypto from 'node:crypto';

const originalFetch = global.fetch;
global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.toString().includes('/info.json')) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => import('../info.json').then(module => module.default),
        });
    } else {
        return originalFetch(url, init);
    }
});

global.TextEncoder = TextEncoder;
vi.stubGlobal('crypto', crypto);
