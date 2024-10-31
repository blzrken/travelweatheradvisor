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
    }
});
