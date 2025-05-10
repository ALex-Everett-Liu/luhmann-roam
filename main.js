const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('path');
const url = require('url');

// Import the Express server
require('./server');

let mainWindow;
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

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
  
  // Wait for everything to load before attempting DevTools
  mainWindow.webContents.on('did-finish-load', () => {
    // Give the app a moment to stabilize
    setTimeout(() => {
      try {
        console.log("Opening DevTools after page load");
        mainWindow.webContents.openDevTools();
      } catch (error) {
        console.error("Error opening DevTools after load:", error);
      }
    }, 5000); // 5 second delay
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Create custom menu with reliable DevTools option
  const menuTemplate = [
    // Get existing menu items first
    ...(Menu.getApplicationMenu()?.items || []),
    // Then add your developer menu
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Force Open DevTools',
          click: () => {
            if (mainWindow) {
              console.log("Force opening DevTools via menu");
              try {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
              } catch (error) {
                console.error("Menu DevTools error:", error);
              }
            }
          },
          accelerator: 'F12'
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.on('ready', async () => {
  // Configure session to handle missing source maps gracefully
  session.defaultSession.webRequest.onErrorOccurred(
    {urls: ['*://*/*']},
    (details) => {
      if (details.error === 'net::ERR_FILE_NOT_FOUND' && 
          details.url.endsWith('.map')) {
        // Silently ignore missing source map errors
        console.log(`Ignored missing source map: ${details.url}`);
      }
    }
  );
  
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
}); 