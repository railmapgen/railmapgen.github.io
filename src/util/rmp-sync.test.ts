import { APISaveInfo } from './constants';
import { decideSyncAction, resolveBoundSaveId } from './rmp-sync';

const saves: APISaveInfo[] = [
    { id: 5, index: 'five', hash: 'hash-5', lastUpdateAt: '2025-01-01T00:00:00Z' },
    { id: 4, index: 'four', hash: 'hash-4', lastUpdateAt: '2025-01-01T00:00:00Z' },
];

describe('rmp-sync', () => {
    describe('resolveBoundSaveId', () => {
        it('prefers the locally bound save when it belongs to the current user', () => {
            expect(
                resolveBoundSaveId({
                    currentUserId: 1,
                    currentSaveId: 4,
                    saves,
                    baseUserId: 1,
                    baseSaveId: 5,
                })
            ).toBe(5);
        });

        it('falls back to the server current save when local binding belongs to another user', () => {
            expect(
                resolveBoundSaveId({
                    currentUserId: 2,
                    currentSaveId: 4,
                    saves,
                    baseUserId: 1,
                    baseSaveId: 5,
                })
            ).toBe(4);
        });

        it('falls back to the newest save when the current save is missing', () => {
            expect(
                resolveBoundSaveId({
                    currentUserId: 2,
                    currentSaveId: 99,
                    saves,
                })
            ).toBe(5);
        });
    });

    describe('decideSyncAction', () => {
        it('pulls the cloud save when there is no local save', () => {
            expect(decideSyncAction({ cloudHash: 'cloud' })).toBe('pull');
        });

        it('aligns metadata when legacy local and cloud data already match', () => {
            expect(decideSyncAction({ localHash: 'same', cloudHash: 'same' })).toBe('align');
        });

        it('pushes when only the local copy has changed', () => {
            expect(decideSyncAction({ localHash: 'local', baseHash: 'base', cloudHash: 'base' })).toBe('push');
        });

        it('pulls when only the cloud copy has changed', () => {
            expect(decideSyncAction({ localHash: 'base', baseHash: 'base', cloudHash: 'cloud' })).toBe('pull');
        });

        it('detects conflict when both local and cloud have changed', () => {
            expect(decideSyncAction({ localHash: 'local', baseHash: 'base', cloudHash: 'cloud' })).toBe('conflict');
        });

        it('does nothing when local and cloud both match the base', () => {
            expect(decideSyncAction({ localHash: 'base', baseHash: 'base', cloudHash: 'base' })).toBe('noop');
        });
    });
});
