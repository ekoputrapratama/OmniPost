const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startLogin: (platform) => ipcRenderer.send('start-login', platform),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
  onConnectionStatusChanged: (callback) => ipcRenderer.on('connection-status-changed', (event, data) => callback(data))
});
