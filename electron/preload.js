const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe API. Extend as needed.
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  version: process.versions.electron,
  getAlwaysOnTop: async () => {
    try {
      return await ipcRenderer.invoke('window:getAlwaysOnTop');
    } catch (e) {
      return false;
    }
  },
  setAlwaysOnTop: async (enabled) => {
    try {
      return await ipcRenderer.invoke('window:setAlwaysOnTop', !!enabled);
    } catch (e) {
      return false;
    }
  },
  toggleAlwaysOnTop: async () => {
    try {
      return await ipcRenderer.invoke('window:toggleAlwaysOnTop');
    } catch (e) {
      return false;
    }
  },
});


