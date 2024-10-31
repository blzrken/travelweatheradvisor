const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

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
        console.log('Attempting to delete file at:', fullPath);
        
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

// Add this helper function to ensure directories exist
async function ensureDirectoryExists(directoryPath) {
    try {
        await fs.access(directoryPath);
    } catch {
        await fs.mkdir(directoryPath, { recursive: true });
    }
}

// Add this to your existing IPC handlers
ipcMain.handle('deleteFile', async (event, { fileName, directory }) => {
    try {
        const filePath = path.join(app.getPath('userData'), directory, fileName);
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
});

// Update the read-activity-file handler
ipcMain.handle('read-activity-file', async (event, { fileName, directory }) => {
    try {
        if (!fileName || !directory) {
            throw new Error('Invalid file path or directory');
        }

        // Use __dirname to get the correct path
        const fullPath = path.join(__dirname, directory, fileName);
        console.log('Reading file from:', fullPath); // Debug log

        try {
            const content = await fs.readFile(fullPath, 'utf8');
            console.log('File content length:', content.length); // Debug log
            return content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('File not found:', fullPath);
                throw new Error('File not found');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in read-activity-file handler:', error);
        throw error;
    }
});

app.whenReady().then(async () => {
    createWindow();
    
    // Create TextFiles directory if it doesn't exist
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

