const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

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
let API_BASE_URL = 'https://omnipost-hub.ai.studio';

let configPath;
app.whenReady().then(() => {
  configPath = path.join(app.getPath('userData'), 'omnipost_companion_config.json');
  loadConfig();
});

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.token) authToken = config.token;
      if (config.apiBaseUrl) API_BASE_URL = config.apiBaseUrl;
      return config;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  return { token: '', apiBaseUrl: 'https://omnipost-hub.ai.studio' };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

// 1. Request the single-instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 2. Reject the second instance by quitting immediately
  app.quit();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 905,
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
    const hostParam = urlObj.searchParams.get('host');
    if (hostParam) {
      API_BASE_URL = decodeURIComponent(hostParam);
    }
    targetPlatform = urlObj.searchParams.get('platform');
    authToken = urlObj.searchParams.get('token');

    // Save configuration
    saveConfig({ token: authToken, apiBaseUrl: API_BASE_URL });

    // Notify renderer if mainWindow is active
    if (mainWindow) {
      mainWindow.webContents.send('connection-status-changed', {
        token: authToken,
        apiBaseUrl: API_BASE_URL
      });
    }

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
  } else if (platform.toLowerCase() === 'linkedin') {
    loginUrl = 'https://www.linkedin.com/login';
  } else if (platform.toLowerCase() === 'pinterest') {
    loginUrl = 'https://www.pinterest.com/login/';
  } else if (platform.toLowerCase() === 'tiktok') {
    loginUrl = 'https://www.tiktok.com/login';
  } else {
    loginUrl = 'https://google.com'; // fallback
  }

  mainWindow.loadURL(loginUrl);
  
  // Intercept navigation to detect successful login
  mainWindow.webContents.on('did-navigate', async (event, url) => {
    if (!isAuthenticating) return;
    
    try {
      const urlObj = new URL(url);
      const isTwitterHome = url === 'https://twitter.com/home' || url === 'https://x.com/home' || (urlObj.host.includes('twitter.com') || urlObj.host.includes('x.com')) && urlObj.pathname === '/home';
      const isInstagramHome = (urlObj.host === 'www.instagram.com' || urlObj.host === 'instagram.com') && (urlObj.pathname === '/' || urlObj.pathname.startsWith('/accounts/onetap'));
      const isFacebookHome = (urlObj.host === 'www.facebook.com' || urlObj.host === 'facebook.com') && (urlObj.pathname === '/' || urlObj.pathname === '/home.php');
      const isLinkedInHome = url.includes('linkedin.com/feed');
      const pinterestMatches = urlObj.host.match(/^[a-z]{2}\.pinterest\.com/);
      const isPinterestHome = (urlObj.host.includes('pinterest') || (pinterestMatches && pinterestMatches.length > 0)) && (urlObj.pathname === '/' || urlObj.pathname === '/feed/' || urlObj.pathname.includes('/homefeed') || urlObj.pathname.startsWith('/today'));
      const isTikTokHome = urlObj.host.includes('tiktok.com') && (urlObj.pathname === '/' || urlObj.pathname.startsWith('/foryou') || urlObj.pathname.startsWith('/explore') || urlObj.pathname.startsWith('/following') || urlObj.pathname.startsWith('/creator-center') || urlObj.host.includes('creator.tiktok.com'));

      if (isTwitterHome || isInstagramHome || isFacebookHome || isLinkedInHome || isPinterestHome || isTikTokHome) {
        isAuthenticating = false;
        
        // Get cookies
        try {
          const cookies = await session.defaultSession.cookies.get({});
          
          // Format cookies into a raw string, but only for the relevant platform domain to reduce size and improve security
          const platLower = platform.toLowerCase();
          const filteredCookies = cookies.filter(c => {
            if (!c.domain) return false;
            if (platLower === 'twitter' || platLower === 'x') {
              return c.domain.includes('twitter.com') || c.domain.includes('x.com');
            } else if (platLower === 'instagram') {
              return c.domain.includes('instagram.com');
            } else if (platLower === 'facebook') {
              return c.domain.includes('facebook.com');
            } else if (platLower === 'linkedin') {
              return c.domain.includes('linkedin.com');
            } else if (platLower === 'pinterest') {
              return c.domain.includes('pinterest');
            } else if (platLower === 'tiktok') {
              return c.domain.includes('tiktok.com');
            }
            return false;
          });

          const cookieString = filteredCookies.map(c => `${c.name}=${c.value}`).join('; ');
          
          // Send back to Omnipost API
          await submitSessionCookie(platform, cookieString);
          mainWindow.loadFile('success.html');
          
        } catch (err) {
          console.error('Failed to extract cookies:', err);
          dialog.showErrorBox('Cookie Extraction Failed', err.message);
          mainWindow.loadFile('index.html');
        }
      }
    } catch (parseErr) {
      console.error('Failed to parse navigation URL:', parseErr);
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
    throw error;
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

  ipcMain.handle('get-connection-status', () => {
    return {
      token: authToken,
      apiBaseUrl: API_BASE_URL
    };
  });

  ipcMain.on('start-login', (event, platform) => {
    startPlatformLogin(platform);
  });
  
  // Handle COLD starts on Windows/Linux
  if (process.platform !== 'darwin') {
    const url = process.argv.find(arg => arg.startsWith('omnipost://'));
    if (url) {
      console.log("handle deeplink on cold boot");
      handleDeepLink(url);
    }
  } 
  // Handle COLD starts on macOS (if event fired before ready)
  else if (deepLinkUrl) {
    handleDeepLink(deepLinkUrl);
    deepLinkUrl = null;
  }
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
