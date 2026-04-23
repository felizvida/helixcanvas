const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("helixcanvasDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  openProjectFile() {
    return ipcRenderer.invoke("workspace:open-project");
  },
  saveProjectFile(payload) {
    return ipcRenderer.invoke("workspace:save-project", payload);
  },
});
