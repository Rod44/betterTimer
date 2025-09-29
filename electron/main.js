const { app, BrowserWindow, shell, ipcMain, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let alwaysOnTopEnabled = false;
let staticServer = null;

const isMac = process.platform === 'darwin';
const isDev = !app.isPackaged;

// Simple HTTP server for serving static files
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const port = 3001;
    const outDir = path.join(__dirname, '../out');
    
    staticServer = http.createServer((req, res) => {
      let filePath = path.join(outDir, req.url === '/' ? 'index.html' : req.url);
      
      // Security check - ensure file is within out directory
      if (!filePath.startsWith(outDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // If file doesn't exist, serve index.html for SPA routing
          fs.readFile(path.join(outDir, 'index.html'), (err2, data2) => {
            if (err2) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data2);
            }
          });
        } else {
          // Set appropriate content type
          const ext = path.extname(filePath);
          const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
          };
          
          const contentType = contentTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });
    
    staticServer.listen(port, '127.0.0.1', () => {
      console.log(`Static server running on http://127.0.0.1:${port}`);
      resolve(`http://127.0.0.1:${port}`);
    });
    
    staticServer.on('error', reject);
  });
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
      webSecurity: false, // Disable web security for file:// protocol
    },
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (app.isPackaged) {
    // In production, start static server and load from it
    startStaticServer().then((url) => {
      mainWindow.loadURL(url);
    }).catch((err) => {
      console.error('Failed to start static server:', err);
    });
  } else {
    // In development, load from localhost
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    
    // Handle failed loads in development (when Next.js isn't ready yet)
    mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
      console.log('Failed to load, retrying...', desc);
      setTimeout(() => {
        mainWindow.webContents.reloadIgnoringCache();
      }, 1000);
    });
  }

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
  if (staticServer) {
    staticServer.close();
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