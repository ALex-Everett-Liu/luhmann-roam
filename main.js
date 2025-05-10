const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

// Import the Express server
require('./server');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL('http://localhost:3003');
  
  // Try multiple approaches to open DevTools
  try {
    console.log("Attempting to open DevTools...");
    mainWindow.webContents.openDevTools();
    
    // Alternative approach with delay
    setTimeout(() => {
      if (mainWindow) {
        console.log("Trying again to open DevTools after delay...");
        mainWindow.webContents.openDevTools();
      }
    }, 2000);
  } catch (error) {
    console.error("Error opening DevTools:", error);
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
}); 