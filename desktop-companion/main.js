const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const axios = require('axios');

// Set up custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('omnipost', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('omnipost');
}

let mainWindow;
let targetPlatform = '';
let authToken = '';
let isAuthenticating = false;

// API URL of your deployed Omnipost app
// UPDATE THIS to your actual deployed app URL before using!
const API_BASE_URL = 'https://omnipost-hub.ai.studio';

// 1. Request the single-instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 2. Reject the second instance by quitting immediately
  app.quit();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    title: 'Omnipost Companion',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
}

function handleDeepLink(url) {
  try {
    const urlObj = new URL(url);
    targetPlatform = urlObj.searchParams.get('platform');
    authToken = urlObj.searchParams.get('token');

    if (targetPlatform && authToken) {
      startPlatformLogin(targetPlatform);
    }
  } catch (error) {
    console.error('Failed to parse deep link:', error);
  }
}

function startPlatformLogin(platform) {
  if (!mainWindow) return;
  isAuthenticating = true;
  
  let loginUrl = '';
  if (platform.toLowerCase() === 'twitter' || platform.toLowerCase() === 'x') {
    loginUrl = 'https://twitter.com/i/flow/login';
  } else if (platform.toLowerCase() === 'instagram') {
    loginUrl = 'https://www.instagram.com/accounts/login/';
  } else if (platform.toLowerCase() === 'facebook') {
    loginUrl = 'https://www.facebook.com/login/';
  } else {
    loginUrl = 'https://google.com'; // fallback
  }

  mainWindow.loadURL(loginUrl);
  
  // Intercept navigation to detect successful login
  mainWindow.webContents.on('did-navigate', async (event, url) => {
    if (!isAuthenticating) return;
    
    // Check if we are on the home page (logged in)
    if (url === 'https://twitter.com/home' || url === 'https://x.com/home' || url === 'https://www.instagram.com/' || url === 'https://www.facebook.com/') {
      isAuthenticating = false;
      
      // Get cookies
      try {
        const cookies = await session.defaultSession.cookies.get({});
        // Format cookies into a raw string
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // Send back to Omnipost API
        mainWindow.loadFile('success.html');
        await submitSessionCookie(platform, cookieString);
        
      } catch (err) {
        console.error('Failed to extract cookies:', err);
        dialog.showErrorBox('Cookie Extraction Failed', err.message);
        mainWindow.loadFile('index.html');
      }
    }
  });
}

async function submitSessionCookie(platform, cookieString) {
  try {
    await axios.post(`${API_BASE_URL}/api/accounts`, {
      platform: platform,
      method: 'session_cookie',
      sessionCookie: cookieString
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Success',
      message: `${platform} account successfully connected! You can now close this window and return to your browser.`
    });
  } catch (error) {
    console.error('API Error:', error);
    dialog.showErrorBox('Sync Failed', 'Failed to send credentials to Omnipost. Check console for details.');
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-app-info', () => {
    return {
      name: app.getName() || 'Omnipost Companion',
      version: app.getVersion() || '1.0.0'
    };
  });

  ipcMain.on('start-login', (event, platform) => {
    startPlatformLogin(platform);
  });
});

// Deep link handler for macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Deep link handler for Windows/Linux
app.on('second-instance', (event, commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const url = commandLine.pop();
  if (url.startsWith('omnipost://')) {
    handleDeepLink(url);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
