const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs/promises");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");

const rootDir = path.resolve(__dirname, "..");
const apiPort = Number(process.env.HELIXCANVAS_API_PORT || 8787);
const appUrl = `http://127.0.0.1:${apiPort}`;
const projectFileFilters = [
  {
    name: "HelixCanvas project",
    extensions: ["json"],
  },
];

let mainWindow = null;
let serverHandle = null;
let quitting = false;

function isDev() {
  return !app.isPackaged;
}

function normalizeProjectFilePath(filePath) {
  if (!filePath) {
    return "";
  }

  if (/\.helixcanvas\.json$/i.test(filePath) || /\.json$/i.test(filePath)) {
    return filePath;
  }

  return `${filePath}.helixcanvas.json`;
}

ipcMain.handle("workspace:open-project", async () => {
  const result = await dialog.showOpenDialog({
    title: "Open HelixCanvas project",
    defaultPath: app.getPath("documents"),
    filters: projectFileFilters,
    properties: ["openFile"],
  });

  if (result.canceled || !result.filePaths[0]) {
    return {
      canceled: true,
    };
  }

  const filePath = result.filePaths[0];
  const contents = await fs.readFile(filePath, "utf8");

  return {
    canceled: false,
    contents,
    fileName: path.basename(filePath),
    filePath,
  };
});

ipcMain.handle("workspace:save-project", async (_event, payload = {}) => {
  const suggestedName =
    typeof payload.suggestedName === "string" && payload.suggestedName.trim()
      ? payload.suggestedName.trim()
      : "helixcanvas-project.helixcanvas.json";
  const contents = typeof payload.contents === "string" ? payload.contents : "";
  let filePath =
    typeof payload.currentPath === "string" && payload.currentPath.trim()
      ? payload.currentPath.trim()
      : "";

  if (!filePath) {
    const result = await dialog.showSaveDialog({
      title: "Save HelixCanvas project",
      defaultPath: path.join(app.getPath("documents"), suggestedName),
      filters: projectFileFilters,
    });

    if (result.canceled || !result.filePath) {
      return {
        canceled: true,
      };
    }

    filePath = result.filePath;
  }

  const normalizedPath = normalizeProjectFilePath(filePath);
  await fs.writeFile(normalizedPath, contents, "utf8");

  return {
    canceled: false,
    fileName: path.basename(normalizedPath),
    filePath: normalizedPath,
  };
});

async function startServer() {
  if (serverHandle) {
    return serverHandle;
  }

  const serverModuleUrl = pathToFileURL(path.join(rootDir, "server", "index.mjs")).href;
  const serverModule = await import(serverModuleUrl);

  if (typeof serverModule.startHelixCanvasServer !== "function") {
    throw new Error("HelixCanvas desktop could not load the embedded server entrypoint.");
  }

  serverHandle = await serverModule.startHelixCanvasServer({
    port: apiPort,
    rootDir,
  });

  serverHandle.on("close", () => {
    if (!quitting) {
      dialog.showErrorBox(
        "HelixCanvas server stopped",
        "The embedded local server stopped unexpectedly.",
      );
    }
    serverHandle = null;
  });

  return serverHandle;
}

function stopServer() {
  if (!serverHandle) {
    return;
  }

  const handle = serverHandle;
  serverHandle = null;
  handle.closeAllConnections?.();
  handle.close();
}

async function createWindow() {
  await startServer();

  mainWindow = new BrowserWindow({
    width: 1560,
    height: 1020,
    minWidth: 1180,
    minHeight: 760,
    title: "HelixCanvas",
    backgroundColor: "#f7f2ea",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(appUrl);

  if (isDev()) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    dialog.showErrorBox(
      "HelixCanvas desktop failed to start",
      error instanceof Error ? error.message : "Unexpected startup error.",
    );
    app.quit();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await createWindow();
      } catch (error) {
        dialog.showErrorBox(
          "HelixCanvas desktop failed to reopen",
          error instanceof Error ? error.message : "Unexpected startup error.",
        );
      }
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  quitting = true;
  stopServer();
});
