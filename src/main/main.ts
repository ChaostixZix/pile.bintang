/* eslint global-require: off, no-console: off, promise/always-return: off */
import {
  app,
  BrowserWindow,
  shell,
  protocol,
  net,
  Menu,
  nativeTheme,
  session,
  ipcMain,
} from 'electron';
import fs from 'fs';
import path from 'path';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import './ipc';
import AppUpdater from './utils/autoUpdates';

Menu.setApplicationMenu(null);

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const setupPilesFolder = () => {
  const userHomeDirectoryPath = app.getPath('home');
  const pilesFolder = path.join(userHomeDirectoryPath, 'Piles');

  if (!fs.existsSync(pilesFolder)) {
    fs.mkdirSync(pilesFolder);
  }
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 960,
    height: 800,
    minWidth: 660,
    minHeight: 660,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: false, // Keep false to allow preload script
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -100, y: -100 }, // Hide traffic lights by moving them off-screen
    transparent: process.platform === 'darwin',
    vibrancy: 'sidebar',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: nativeTheme.shouldUseDarkColors ? 'white' : 'black',
      height: 50,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // setupAutoUpdater(mainWindow);
  new AppUpdater(mainWindow);
};

// OAuth handler for Google authentication
const handleOAuth = async (authUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create a separate session for OAuth to avoid CSP restrictions
    const oauthSession = session.fromPartition('oauth');
    
    const oauthWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // Disable web security for OAuth
        javascript: true, // Explicitly enable JavaScript
        sandbox: false, // Disable sandbox for OAuth
        enableRemoteModule: false,
        allowRunningInsecureContent: true,
        session: oauthSession, // Use separate session
      },
    });

    console.log('Loading OAuth URL in popup:', authUrl);
    oauthWindow.loadURL(authUrl);

    // Handle successful callback
    oauthWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      console.log('OAuth navigation to:', navigationUrl);
      const parsedUrl = new URL(navigationUrl);
      
      if (parsedUrl.pathname === '/auth/callback' || 
          parsedUrl.hash.includes('access_token') ||
          parsedUrl.search.includes('code=')) {
        console.log('OAuth callback detected, closing popup');
        event.preventDefault();
        oauthWindow.close();
        resolve(navigationUrl);
      }
    });

    // Handle window closed
    oauthWindow.on('closed', () => {
      reject(new Error('OAuth window was closed by user'));
    });

    // Handle navigation errors
    oauthWindow.webContents.on('did-fail-load', (_, __, errorDescription) => {
      oauthWindow.close();
      reject(new Error(`OAuth failed to load: ${errorDescription}`));
    });
  });
};

// IPC handler for OAuth
ipcMain.handle('oauth-google', async (_, authUrl) => {
  try {
    const callbackUrl = await handleOAuth(authUrl);
    return { success: true, callbackUrl };
  } catch (error) {
    console.error('OAuth error:', error);
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    protocol.handle('local', (request) => {
      const filePath = request.url.slice('local://'.length);
      return net.fetch(`file://${filePath}`);
    });

    // Register custom protocol for OAuth callbacks
    if (!app.isDefaultProtocolClient('pilebintang')) {
      app.setAsDefaultProtocolClient('pilebintang');
    }

    // Configure session-level CSP headers (header-only, dev/prod variants)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const isDev = isDebug;

      const cspDirectives = [
        "default-src 'self'",
        // Avoid inline scripts when possible; allow eval only in dev for webpack tooling
        isDev ? "script-src 'self' 'unsafe-eval'" : "script-src 'self'",
        // Style-loader injects <style> tags; allow inline styles
        "style-src 'self' 'unsafe-inline'",
        // Allow local protocol (for protocol handler), data URIs and blobs for images
        "img-src 'self' data: blob: local:",
        "font-src 'self' data:",
        // Dev server and HMR need localhost + ws; production includes Supabase and OAuth providers
        isDev
          ? "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* https://generativelanguage.googleapis.com https://*.supabase.co https://accounts.google.com"
          : "connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        // Prevent embedding
        "frame-ancestors 'none'",
        // Workers may use blob: URLs
        "worker-src 'self' blob:",
      ];

      const csp = cspDirectives.join('; ');

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp],
        },
      });
    });

    setupPilesFolder();
    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
