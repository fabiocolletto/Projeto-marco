export const DB_NAME = 'appbase_db';
export const DB_VERSION = 1;
export const upgrade = (db, oldVersion) => {
    if (oldVersion < 1) {
        const profiles = db.createObjectStore('profiles', { keyPath: 'id' });
        profiles.createIndex('byUpdatedAt', 'updatedAt');
        db.createObjectStore('settings', { keyPath: 'key' });
        const telemetry = db.createObjectStore('telemetry', { keyPath: 'id' });
        telemetry.createIndex('byTs', 'ts');
    }
};
//# sourceMappingURL=migrations.js.map