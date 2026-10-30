export const IPC = {
  appVersion: "app:version",
  appPlatform: "app:platform",
  openExternal: "app:open-external",

  detect: "installs:detect",
  chooseFolder: "installs:choose-folder",
  openInstallFolder: "installs:open-folder",

  install: "actions:install",
  repair: "actions:repair",
  uninstall: "actions:uninstall",
  restart: "actions:restart",

  listExtensions: "extensions:list",
  setExtension: "extensions:set-enabled",
  openExtensions: "extensions:open-folder",

  listThemes: "themes:list",
  applyTheme: "themes:apply",
  openThemes: "themes:open-folder",

  storeCatalog: "store:catalog",
  storeInstall: "store:install",
  storeUninstall: "store:uninstall",
  storeUpdate: "store:update",

  getSettings: "settings:get",
  patchSettings: "settings:patch",
  openConfig: "settings:open-config",

  getUpdateState: "update:get-state",
  checkUpdate: "update:check",
  downloadUpdate: "update:download",
  installUpdate: "update:install",
  updateState: "events:update-state",

  progress: "events:progress",
} as const;
