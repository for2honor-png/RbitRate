const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  invoke: (channel, args) => ipcRenderer.invoke(channel, args),
  on:     (channel, callback) => {
    const sub = (_, ...args) => callback(...args);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  onOrderNew: (callback) => {
    const sub = (_, data) => callback(data);
    ipcRenderer.on('orders:new', sub);
    return () => ipcRenderer.removeListener('orders:new', sub);
  },
});

contextBridge.exposeInMainWorld('electronAPI', {
  pickImageFile: () => ipcRenderer.invoke('dialog:pickImage'),
});

contextBridge.exposeInMainWorld('sync', {
  now:      ()         => ipcRenderer.invoke('sync:now'),
  getStatus: ()        => ipcRenderer.invoke('sync:status'),
  reset:    ()         => ipcRenderer.invoke('sync:reset'),
  onStatus: (callback) => {
    const sub = (_, data) => callback(data);
    ipcRenderer.on('sync:status', sub);
    return () => ipcRenderer.removeListener('sync:status', sub);
  },
});
