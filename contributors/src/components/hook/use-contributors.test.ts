import { act, renderHook } from '@testing-library/react';
import useContributors from './use-contributors';
import { vi } from 'vitest';
import { waitForMs } from '@railmapgen/rmg-runtime/util';

const originalFetch = global.fetch;
const mockFetch = vi.fn().mockImplementation(async url => {
    if (url.includes('api.github.com') && url.endsWith('page=1')) {
        await waitForMs(500);
        return {
            json: () =>
                Promise.resolve([
                    { login: 'wongchito' },
                    { login: 'thekingofcity' },
                    { login: 'a' },
                    { login: 'b' },
                    ...Array(96)
                        .fill(0)
                        .map((_, i) => ({ login: 'user-1-' + i })),
                ]),
        };
    } else if (url.includes('api.github.com') && url.endsWith('page=2')) {
        await waitForMs(500);
        return {
            json: () =>
                Promise.resolve(
                    Array(10)
                        .fill(0)
                        .map((_, i) => ({
                            login: 'user-2-' + i,
                        }))
                ),
        };
    } else if (url.includes('legacy-contributor-list')) {
        await waitForMs(1000);
        return {
            text: () => Promise.resolve('b\nc\n'),
        };
    } else {
        console.warn(url, 'is not mocked');
    }
});

describe('useContributors', () => {
    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('Can load all contributors plus legacy contributors as expected', async () => {
        global.fetch = mockFetch;

        vi.useFakeTimers();
        const { result } = renderHook(() => useContributors('rmg-palette'));

        // original value
        expect(result.current.contributors).toHaveLength(0);
        expect(result.current.isLoading).toBeTruthy();
        expect(result.current.isError).toBeFalsy();

        // page 1 resolved
        expect(mockFetch).toBeCalledTimes(1);
        await act(async () => {
            vi.advanceTimersByTime(501);
        });
        expect(result.current.isLoading).toBeTruthy(); // still loading

        // page 2 resolved
        expect(mockFetch).toBeCalledTimes(2);
        await act(async () => {
            vi.advanceTimersByTime(501);
        });
        expect(result.current.contributors).toHaveLength(98 + 10); // excludes wongchito and thekingofcity
        expect(result.current.isLoading).toBeTruthy(); // still loading

        // legacy resolved
        await act(async () => {
            vi.advanceTimersByTime(1001);
        });
        expect(result.current.contributors).toHaveLength(98 + 10 + 1); // b is duplicated
        expect(result.current.isLoading).toBeFalsy();
        expect(result.current.isError).toBeFalsy();

        expect(mockFetch).toBeCalledTimes(3);
    });
});
