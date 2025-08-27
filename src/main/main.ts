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
} from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import fs from 'fs';
import path from 'path';
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
      forceDownload
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
    trafficLightPosition: { x: 18, y: 16 },
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
      return net.fetch('file://' + filePath);
    });

  // Configure session-level CSP headers (header-only, dev/prod variants)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = isDebug;

    const cspDirectives = [
      "default-src 'self'",
      // Avoid inline scripts when possible; allow eval only in dev for webpack tooling
      isDev
        ? "script-src 'self' 'unsafe-eval'"
        : "script-src 'self'",
      // Style-loader injects <style> tags; allow inline styles
      "style-src 'self' 'unsafe-inline'",
      // Allow local protocol (for protocol handler), data URIs and blobs for images
      "img-src 'self' data: blob: local:",
      "font-src 'self' data:",
      // Dev server and HMR need localhost + ws; production restricts to Google API only
      isDev
        ? "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* https://generativelanguage.googleapis.com"
        : "connect-src 'self' https://generativelanguage.googleapis.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Prevent embedding
      "frame-ancestors 'none'",
      // Workers may use blob: URLs
      "worker-src 'self' blob:"
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
