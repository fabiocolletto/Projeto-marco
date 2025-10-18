let appConfig = { publicAdmin: false, baseHref: '/' };
let registryEntries = [];
const manifestCache = new Map();
export function setAppConfig(config) {
    appConfig = config;
}
export function getAppConfig() {
    return appConfig;
}
export function setRegistryEntries(entries) {
    registryEntries = entries;
}
export function getRegistryEntries() {
    return registryEntries;
}
export function getManifestCache() {
    return manifestCache;
}
//# sourceMappingURL=state.js.map