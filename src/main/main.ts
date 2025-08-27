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

    let resolved = false;
    let lastAuthUrl: string | null = null;

    // Deep-link callback handler (macOS)
    const onOpenUrl = (event: Electron.Event, url: string) => {
      event.preventDefault();
      if (!resolved) {
        console.log('Received deep link OAuth callback:', url);
        resolved = true;
        try {
          oauthWindow.close();
        } catch {}
        cleanup();
        resolve(url);
      }
    };

    const cleanup = () => {
      try {
        app.removeListener('open-url', onOpenUrl as any);
      } catch {}
    };

    // Register deep link handler (works on macOS)
    app.on('open-url', onOpenUrl as any);

    const maybeHandleCallback = (
      event: Electron.Event | null,
      navigationUrl: string,
    ) => {
      try {
        const parsedUrl = new URL(navigationUrl);

        const isCallbackPath = parsedUrl.pathname === '/auth/callback';
        const isCustomScheme = parsedUrl.protocol === 'pilebintang:'; // deep link support
        const hasAccessToken =
          parsedUrl.hash.includes('access_token') ||
          parsedUrl.search.includes('access_token=');
        const hasCode = parsedUrl.search.includes('code=');

        if (isCallbackPath || isCustomScheme || hasAccessToken || hasCode) {
          console.log('OAuth callback detected, closing popup');
          if (hasAccessToken || hasCode) {
            lastAuthUrl = navigationUrl;
          }
          if (event && typeof (event as any).preventDefault === 'function') {
            (event as any).preventDefault();
          }
          if (!resolved) {
            resolved = true;
            try {
              oauthWindow.close();
            } catch {}
            cleanup();
            resolve(navigationUrl);
          }
        }
      } catch (err) {
        // Ignore URL parse errors
      }
    };

    // Handle successful callback across multiple navigation events
    oauthWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      console.log('OAuth navigation to:', navigationUrl);
      maybeHandleCallback(event, navigationUrl);
    });

    oauthWindow.webContents.on('will-redirect', (event, navigationUrl) => {
      console.log('OAuth redirect to:', navigationUrl);
      maybeHandleCallback(event, navigationUrl);
    });

    oauthWindow.webContents.on('did-redirect-navigation', (_event, navigationUrl) => {
      console.log('OAuth did-redirect to:', navigationUrl);
      maybeHandleCallback(null, navigationUrl);
    });

    oauthWindow.webContents.on('did-navigate', (_event, navigationUrl) => {
      // As a safety net: if we end up navigating to the app origin (home) inside the popup,
      // close and return the last known auth URL (with code/tokens) if we captured it.
      try {
        const parsedUrl = new URL(navigationUrl);
        const isAppOrigin =
          parsedUrl.protocol === 'file:' ||
          parsedUrl.protocol === 'local:' ||
          (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1');

        if (isAppOrigin && !resolved) {
          console.log('Navigated to app origin in OAuth window; closing popup');
          resolved = true;
          try {
            oauthWindow.close();
          } catch {}
          cleanup();
          resolve(lastAuthUrl || navigationUrl);
        }
      } catch {}
    });

    // Catch provisional load failures (often triggered by custom schemes)
    oauthWindow.webContents.on(
      'did-fail-provisional-load',
      (
        _event,
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      ) => {
        console.log(
          'OAuth did-fail-provisional-load:',
          errorCode,
          errorDescription,
          validatedURL,
        );
        if (validatedURL && validatedURL.startsWith('pilebintang://')) {
          if (!resolved) {
            console.log('Handling custom scheme on provisional fail, resolving');
            resolved = true;
            try {
              oauthWindow.close();
            } catch {}
            cleanup();
            resolve(validatedURL);
            return;
          }
        }
        // Otherwise ignore; Chromium may emit provisional failures during redirects.
      },
    );

    // Intercept attempts to open new windows for the deep link
    oauthWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('pilebintang://')) {
        console.log('OAuth setWindowOpenHandler caught deep link:', url);
        if (!resolved) {
          resolved = true;
          try {
            oauthWindow.close();
          } catch {}
          cleanup();
          resolve(url);
        }
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });

    // Handle window closed
    oauthWindow.on('closed', () => {
      if (!resolved) {
        reject(new Error('OAuth window was closed by user'));
      }
    });

    // Hard timeout as a final fallback to avoid hanging the flow
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn('OAuth flow timed out, rejecting');
        try {
          oauthWindow.close();
        } catch {}
        cleanup();
        reject(new Error('OAuth timeout'));
      }
    }, 2 * 60 * 1000);

    // Ensure timeout is cleared on resolve
    const originalResolve = resolve;
    resolve = (url: string) => {
      clearTimeout(timeoutId);
      originalResolve(url);
    };

    // Handle navigation errors
    oauthWindow.webContents.on(
      'did-fail-load',
      (
        _event,
        errorCode,
        errorDescription,
        validatedURL,
      ) => {
        // If the failure was caused by our custom scheme, resolve.
        if (validatedURL && validatedURL.startsWith('pilebintang://')) {
          console.log(
            'OAuth did-fail-load on custom scheme; resolving via deep link:',
            validatedURL,
          );
          if (!resolved) {
            resolved = true;
            try {
              oauthWindow.close();
            } catch {}
            cleanup();
            resolve(validatedURL);
          }
          return;
        }

        // Otherwise, ignore load failures; OAuth flows can trigger benign errors.
        console.warn(
          'Ignoring did-fail-load during OAuth:',
          errorCode,
          errorDescription,
          validatedURL,
        );
      },
    );
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
