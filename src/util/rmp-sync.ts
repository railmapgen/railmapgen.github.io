import { APISaveInfo } from './constants';

export type RmpSyncAction = 'noop' | 'align' | 'pull' | 'push' | 'conflict';

interface ResolveBoundSaveIdParams {
    currentUserId?: number;
    currentSaveId?: number;
    saves: APISaveInfo[];
    baseUserId?: number;
    baseSaveId?: number;
}

interface DecideSyncActionParams {
    localHash?: string;
    baseHash?: string;
    cloudHash?: string;
}

export const resolveBoundSaveId = ({
    currentUserId,
    currentSaveId,
    saves,
    baseUserId,
    baseSaveId,
}: ResolveBoundSaveIdParams): number | undefined => {
    const saveIds = new Set(saves.map(save => save.id));

    if (currentUserId && baseUserId === currentUserId && baseSaveId && saveIds.has(baseSaveId)) {
        return baseSaveId;
    }

    if (currentSaveId && saveIds.has(currentSaveId)) {
        return currentSaveId;
    }

    return saves.at(0)?.id;
};

export const decideSyncAction = ({ localHash, baseHash, cloudHash }: DecideSyncActionParams): RmpSyncAction => {
    if (!cloudHash) {
        return localHash ? 'conflict' : 'noop';
    }

    if (!localHash) {
        return 'pull';
    }

    if (!baseHash) {
        return localHash === cloudHash ? 'align' : 'conflict';
    }

    const localDirty = localHash !== baseHash;
    const cloudAdvanced = cloudHash !== baseHash;

    if (!localDirty && !cloudAdvanced) {
        return 'noop';
    }

    if (!localDirty && cloudAdvanced) {
        return 'pull';
    }

    if (localDirty && !cloudAdvanced) {
        return 'push';
    }

    return 'conflict';
};
