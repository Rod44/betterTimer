const { app, BrowserWindow, shell, ipcMain, screen } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow = null;
let nextServerProcess = null;
let alwaysOnTopEnabled = false;

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;
const DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:3000';

function waitForServer(urlString, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryRequest = () => {
      const req = http.get(urlString, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          res.destroy();
          resolve();
        } else {
          res.resume();
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(3000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Timed out waiting for server'));
        return;
      }
      setTimeout(tryRequest, 500);
    };

    tryRequest();
  });
}

function startNextServer() {
  const nextBin = require.resolve('next/dist/bin/next');
  const port = process.env.PORT || '3000';
  const cwd = process.cwd();
  const env = { ...process.env, NODE_ENV: 'production', PORT: port };

  // Use the embedded Node when packaged
  const nodeExec = process.execPath;

  const child = spawn(nodeExec, [nextBin, 'start', '-p', port], {
    cwd,
    env,
    stdio: 'inherit',
  });

  nextServerProcess = child;

  return waitForServer(`http://localhost:${port}`).then(() => `http://localhost:${port}`);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 120,
    minWidth: 320,
    minHeight: 120,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: alwaysOnTopEnabled,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 7, y: 4 } : undefined,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const loadApp = async () => {
    try {
      if (isDev) {
        await waitForServer(DEV_URL).catch(() => {});
        await mainWindow.loadURL(DEV_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      } else {
        const urlToLoad = await startNextServer();
        await mainWindow.loadURL(urlToLoad);
      }
    } catch (err) {
      console.error('Failed to load app:', err);
    }
  };

  loadApp();

  // Adjust opacity based on focus to make the app less intrusive when unfocused
  try {
    // Start fully opaque by default
    if (mainWindow && typeof mainWindow.setOpacity === 'function') {
      mainWindow.setOpacity(1);
    }
  } catch (e) {}

  mainWindow.on('focus', () => {
    try {
      if (typeof mainWindow.setOpacity === 'function') {
        mainWindow.setOpacity(1);
      }
    } catch (e) {}
  });

  mainWindow.on('blur', () => {
    try {
      if (typeof mainWindow.setOpacity === 'function') {
        mainWindow.setOpacity(1);
      }
    } catch (e) {}
  });

  // Ensure initial always-on-top state is applied with a reasonable level
  if (mainWindow) {
    try {
      mainWindow.setAlwaysOnTop(alwaysOnTopEnabled, 'floating');
    } catch (e) {
      // no-op
    }
  }

  // Position window at bottom-right of the primary display
  try {
    const display = screen.getPrimaryDisplay();
    const workArea = display.workArea; // accounts for menu bar/dock
    const [winWidth, winHeight] = mainWindow.getSize();
    const margin = 0; // small offset from edges
    const x = Math.max(workArea.x, workArea.x + workArea.width - winWidth - margin);
    const y = Math.max(workArea.y, workArea.y + workArea.height - winHeight - margin);
    mainWindow.setPosition(x, y);
  } catch (e) {
    // ignore if screen info not available
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServerProcess && !nextServerProcess.killed) {
    try {
      nextServerProcess.kill();
    } catch (e) {}
  }
});

// IPC: always-on-top controls
ipcMain.handle('window:getAlwaysOnTop', () => {
  try {
    return mainWindow ? mainWindow.isAlwaysOnTop() : false;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('window:setAlwaysOnTop', (_event, enabled) => {
  alwaysOnTopEnabled = !!enabled;
  if (mainWindow) {
    try {
      mainWindow.setAlwaysOnTop(alwaysOnTopEnabled, 'floating');
    } catch (e) {
      // no-op
    }
  }
  return alwaysOnTopEnabled;
});

ipcMain.handle('window:toggleAlwaysOnTop', () => {
  alwaysOnTopEnabled = !alwaysOnTopEnabled;
  if (mainWindow) {
    try {
      mainWindow.setAlwaysOnTop(alwaysOnTopEnabled, 'floating');
    } catch (e) {
      // no-op
    }
  }
  return alwaysOnTopEnabled;
});


