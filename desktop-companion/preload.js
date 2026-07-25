const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startLogin: (platform) => ipcRenderer.send('start-login', platform),
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
});
