import crypto from 'node:crypto';
import { setupTest } from '@railmapgen/mantine-components/utils';

setupTest();

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

vi.stubGlobal('crypto', crypto);
