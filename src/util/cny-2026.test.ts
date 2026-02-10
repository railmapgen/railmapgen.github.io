import { isInCNY2026Period, fetchNetworkTime, CNY_CHECK_INTERVAL } from './cny-2026';

describe('CNY 2026 utilities', () => {
    describe('isInCNY2026Period', () => {
        it('should return true for timestamp within the CNY period', () => {
            // Feb 17, 2026 12:00:00 UTC (well within period)
            const timestamp = new Date('2026-02-17T12:00:00Z').getTime();
            expect(isInCNY2026Period(timestamp)).toBe(true);
        });

        it('should return true for the start of the CNY period', () => {
            // Feb 14, 2026 16:00:00 UTC = Feb 15 00:00:00 UTC+8
            const timestamp = new Date('2026-02-14T16:00:00Z').getTime();
            expect(isInCNY2026Period(timestamp)).toBe(true);
        });

        it('should return true for the end of the CNY period', () => {
            // Feb 23, 2026 15:59:59 UTC = Feb 23 23:59:59 UTC+8
            const timestamp = new Date('2026-02-23T15:59:59Z').getTime();
            expect(isInCNY2026Period(timestamp)).toBe(true);
        });

        it('should return false for timestamp before the CNY period', () => {
            // Feb 14, 2026 15:59:59 UTC (just before period starts)
            const timestamp = new Date('2026-02-14T15:59:59Z').getTime();
            expect(isInCNY2026Period(timestamp)).toBe(false);
        });

        it('should return false for timestamp after the CNY period', () => {
            // Feb 23, 2026 16:00:00 UTC (just after period ends)
            const timestamp = new Date('2026-02-23T16:00:00Z').getTime();
            expect(isInCNY2026Period(timestamp)).toBe(false);
        });

        it('should return false for epoch time (0)', () => {
            expect(isInCNY2026Period(0)).toBe(false);
        });
    });

    describe('fetchNetworkTime', () => {
        it('should return 0 when all time servers fail', async () => {
            vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
            const result = await fetchNetworkTime();
            expect(result).toBe(0);
        });

        it('should return timestamp from worldtimeapi.org format', async () => {
            const mockUnixTime = 1771344000; // some timestamp in seconds
            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ unixtime: mockUnixTime }),
            } as Response);

            const result = await fetchNetworkTime();
            expect(result).toBe(mockUnixTime * 1000);
        });

        it('should return timestamp from timeapi.io format', async () => {
            const mockDateTime = '2026-02-17T12:00:00Z';
            vi.spyOn(global, 'fetch')
                .mockResolvedValueOnce({ ok: false } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ dateTime: mockDateTime }),
                } as Response);

            const result = await fetchNetworkTime();
            expect(result).toBe(new Date(mockDateTime).getTime());
        });
    });

    describe('CNY_CHECK_INTERVAL', () => {
        it('should be 15 minutes in milliseconds', () => {
            expect(CNY_CHECK_INTERVAL).toBe(15 * 60 * 1000);
        });
    });
});
