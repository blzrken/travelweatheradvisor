const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveActivityFile: async (data) => {
        try {
            return await ipcRenderer.invoke('save-activity-file', data);
        } catch (error) {
            throw new Error(`Failed to save file: ${error.message}`);
        }
    },
    deleteActivityFile: async (data) => {
        try {
            return await ipcRenderer.invoke('delete-activity-file', data);
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    },
    readActivityFile: async (data) => {
        try {
            return await ipcRenderer.invoke('read-activity-file', data);
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
    },
    saveTextFile: async (data) => {
        try {
            return await ipcRenderer.invoke('save-text-file', data);
        } catch (error) {
            throw new Error(`Failed to save text file: ${error.message}`);
        }
    },
    readTextFile: async (data) => {
        try {
            return await ipcRenderer.invoke('read-text-file', data);
        } catch (error) {
            throw new Error(`Failed to read text file: ${error.message}`);
        }
    },
    showSaveDialog: async (data) => {
        try {
            return await ipcRenderer.invoke('show-save-dialog', data);
        } catch (error) {
            throw new Error(`Failed to save file: ${error.message}`);
        }
    },
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    onMaximize: (callback) => ipcRenderer.on('window-maximized', callback),
    onUnmaximize: (callback) => ipcRenderer.on('window-unmaximized', callback)
});


