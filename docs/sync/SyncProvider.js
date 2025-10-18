import { DriveStub } from './providers/DriveStub.js';
import { OneDriveStub } from './providers/OneDriveStub.js';
const factories = {
    drive: () => new DriveStub(),
    onedrive: () => new OneDriveStub(),
};
const resolveEnv = (key) => {
    const globalRecord = globalThis;
    const nodeEnv = globalRecord.process?.env;
    if (nodeEnv && key in nodeEnv) {
        return nodeEnv[key];
    }
    try {
        const metaEnv = import.meta?.env;
        const value = metaEnv?.[key];
        if (typeof value === 'string')
            return value;
    }
    catch (error) {
        // ignore
    }
    if (key in globalRecord) {
        const value = globalRecord[key];
        if (typeof value === 'string')
            return value;
    }
    return undefined;
};
export const resolveSyncProvider = (provider) => {
    const selected = (provider ?? resolveEnv('SYNC_PROVIDER')) || 'none';
    if (selected === 'none')
        return undefined;
    const factory = factories[selected];
    return factory ? factory() : undefined;
};
//# sourceMappingURL=SyncProvider.js.map