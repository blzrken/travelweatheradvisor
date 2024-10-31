const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Make the window frameless
        transparent: true, // Enable transparency
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Make the window start maximized
    mainWindow.maximize();
    // Optional: If you want true fullscreen (without taskbar)
    // mainWindow.setFullScreen(true);

    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Optional: Listen for maximize/unmaximize events to update UI
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximized');
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-unmaximized');
    });
}

// Add window control handlers
ipcMain.handle('minimize-window', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.handle('maximize-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
        win.unmaximize();
    } else {
        win?.maximize();
    }
});

ipcMain.handle('close-window', () => {
    BrowserWindow.getFocusedWindow()?.close();
});

// Handle file saving
ipcMain.handle('save-activity-file', async (event, { fileName, content, directory }) => {
    try {
        // Create full directory path
        const fullPath = path.join(__dirname, directory);
        
        // Create directory if it doesn't exist
        await fs.mkdir(fullPath, { recursive: true });
        
        // Write the file
        const filePath = path.join(fullPath, fileName);
        await fs.writeFile(filePath, content, 'utf8');
        
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        throw error;
    }
});

// Handle file deletion
ipcMain.handle('delete-activity-file', async (event, { fileName, directory }) => {
    try {
        if (!fileName || !directory) {
            throw new Error('Invalid file path or directory');
        }

        const fullPath = path.join(__dirname, directory, fileName);
        try {
            await fs.access(fullPath);
            await fs.unlink(fullPath);
            console.log('Successfully deleted file:', fullPath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('File does not exist:', fullPath);
                return true;
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in delete-activity-file handler:', error);
        throw error;
    }
});

// Add read text file handler
ipcMain.handle('read-text-file', async (event, { fileName, directory }) => {
    try {
        if (!fileName || !directory) {
            throw new Error('Invalid file path or directory');
        }

        const fullPath = path.join(__dirname, directory, fileName);
        console.log('Reading text file from:', fullPath);

        try {
            const content = await fs.readFile(fullPath, 'utf8');
            return content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('File not found');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error reading text file:', error);
        throw error;
    }
});

// Add save text file handler
ipcMain.handle('save-text-file', async (event, { fileName, content, directory }) => {
    try {
        const fullPath = path.join(__dirname, directory);
        await fs.mkdir(fullPath, { recursive: true });
        const filePath = path.join(fullPath, fileName);
        await fs.writeFile(filePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving text file:', error);
        throw error;
    }
});

// Helper function to ensure directories exist
async function ensureDirectoryExists(directoryPath) {
    try {
        await fs.access(directoryPath);
    } catch {
        await fs.mkdir(directoryPath, { recursive: true });
    }
}

// Update the read-activity-file handler
ipcMain.handle('read-activity-file', async (event, { fileName, directory }) => {
    try {
        if (!fileName || !directory) {
            throw new Error('Invalid file path or directory');
        }

        const fullPath = path.join(__dirname, directory, fileName);
        console.log('Reading file from:', fullPath);

        try {
            const content = await fs.readFile(fullPath, 'utf8');
            return content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('File not found');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in read-activity-file handler:', error);
        throw error;
    }
});

// Add this new IPC handler for save dialog
ipcMain.handle('show-save-dialog', async (event, { defaultPath, content }) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            defaultPath: defaultPath,
            filters: [
                { name: 'Text Files', extensions: ['txt'] }
            ],
            properties: ['showOverwriteConfirmation']
        });

        if (filePath) {
            await fs.writeFile(filePath, content, 'utf8');
            return { success: true, filePath };
        }
        return { success: false, message: 'No file path selected' };
    } catch (error) {
        console.error('Error in show-save-dialog:', error);
        return { success: false, message: error.message };
    }
});

app.whenReady().then(async () => {
    createWindow();
    
    // Create necessary directories
    const textFilesPath = path.join(__dirname, 'TextFiles');
    await ensureDirectoryExists(textFilesPath);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

