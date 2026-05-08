const { app, BrowserWindow, ipcMain, Menu } = require("electron")
const path = require("path")
const fs = require("fs")
const http = require("http")
const Database = require("better-sqlite3")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

let mainWindow
let db
let staticServer
let packagedAppUrl = null

function resolveOutDir() {
  const isPackaged = app.isPackaged
  const appPath = app.getAppPath()
  
  const candidates = [
    path.join(appPath, "out"),
    path.join(process.resourcesPath, "app.asar", "out"),
    path.join(process.resourcesPath, "out"),
    path.join(__dirname, "out"),
  ]

  console.log("Checking outDir candidates:", candidates)

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        console.log("Selected outDir:", candidate)
        return candidate
      }
    } catch (e) {
      // Ignore errors for non-existent paths
    }
  }

  const defaultPath = isPackaged ? path.join(appPath, "out") : path.join(__dirname, "out")
  console.warn("No candidate outDir found, falling back to:", defaultPath)
  return defaultPath
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8"
    case ".js":
      return "application/javascript; charset=utf-8"
    case ".css":
      return "text/css; charset=utf-8"
    case ".json":
      return "application/json; charset=utf-8"
    case ".svg":
      return "image/svg+xml"
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".gif":
      return "image/gif"
    case ".ico":
      return "image/x-icon"
    case ".webp":
      return "image/webp"
    case ".map":
      return "application/json; charset=utf-8"
    default:
      return "application/octet-stream"
  }
}

function resolveExportedFile(outDir, requestPath) {
  const decoded = decodeURIComponent((requestPath || "/").split("?")[0])
  const normalized = decoded === "/" ? "index" : decoded.replace(/^\/+|\/+$/g, "")
  const candidates = [
    path.join(outDir, normalized),
    path.join(outDir, `${normalized}.html`),
    path.join(outDir, normalized, "index.html"),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  // If the request looks like a concrete asset/file, don't fall back to HTML.
  if (path.extname(decoded)) {
    return null
  }

  const notFound = path.join(outDir, "404.html")
  if (fs.existsSync(notFound)) return notFound

  return path.join(outDir, "index.html")
}

function startStaticServer(outDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const filePath = resolveExportedFile(outDir, req.url || "/")
        if (!filePath) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
          res.end("Not Found")
          return
        }
        const data = fs.readFileSync(filePath)
        res.writeHead(200, { "Content-Type": getContentType(filePath) })
        res.end(data)
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" })
        res.end(`Failed to serve static file: ${error.message}`)
      }
    })

    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine static server port"))
        return
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}` })
    })
  })
}

// ----------------------------
// CREATE WINDOW
// ----------------------------
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  const isDev = !app.isPackaged;

  if (isDev) {
    await mainWindow.loadURL("http://localhost:3000")
  } else {
    const outDir = resolveOutDir()
    console.log("Serving static files from:", outDir)
    const { server, url } = await startStaticServer(outDir)
    staticServer = server
    packagedAppUrl = url

    const redirectPackagedRoute = (targetUrl) => {
      if (!packagedAppUrl) return false
      if (!targetUrl.startsWith("file:///")) return false
      try {
        const parsed = new URL(targetUrl)
        const route = parsed.pathname.replace(/^\/[A-Za-z]:/, "")
        mainWindow.loadURL(`${packagedAppUrl}${route || "/"}`)
        return true
      } catch {
        return false
      }
    }

    mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
      if (redirectPackagedRoute(targetUrl)) event.preventDefault()
    })

    mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
      if (redirectPackagedRoute(targetUrl)) {
        return { action: "deny" }
      }
      return { action: "allow" }
    })

    await mainWindow.loadURL(url)
  }
}
// ----------------------------
// APP READY
// ----------------------------
app.whenReady().then(async () => {
  // ✅ Setup SQLite inside Electron ONLY
  let dbPath

if (!app.isPackaged) {
  // DEV MODE
  dbPath = path.join(__dirname, "database.sqlite")
} else {
  // PRODUCTION MODE (inside installed app)
  dbPath = path.join(process.resourcesPath, "database.sqlite")
}

db = new Database(dbPath)

console.log("Using database at:", dbPath)
  db = new Database(dbPath)
  console.log(dbPath)

  // ----------------------------
  // LOGIN IPC HANDLER
  // ----------------------------
  ipcMain.handle("login-user", async (event, { email, password }) => {
    if (!email || !password) {
      return { success: false, message: "Email and password required" }
    }

    const user = db.prepare(`
      SELECT 
        UserId,
        Email,
        PasswordHash,
        Role,
        IsActive
      FROM users
      WHERE Email = ?
        AND DeletedAt IS NULL
    `).get(email)

    if (!user) {
      return { success: false, message: "Invalid email or password" }
    }

    if (!user.IsActive) {
      return { success: false, message: "Account disabled" }
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.PasswordHash
    )

    if (!passwordValid) {
      return { success: false, message: "Invalid email or password" }
    }

    const token = jwt.sign(
      { userId: user.UserId, role: user.Role },
      "offline_secret",
      { expiresIn: "1d" }
    )

    return {
      success: true,
      token,
      user: {
        UserId: user.UserId,
        Email: user.Email,
        Role: user.Role,
      },
    }
  })

  // ----------------------------
// ADDITIONAL IPC HANDLERS
// ----------------------------

// 1️⃣ GET TUTORIAL COUNTS
ipcMain.handle("get-tutorial-counts", () => {
  try {
    const stmt = db.prepare(`
      SELECT
        type,
        COUNT(*) AS tutorial_count
      FROM tutorial_master
      GROUP BY type
      ORDER BY type
    `)

    return stmt.all()
  } catch (err) {
    console.error("TUTORIAL COUNT ERROR:", err.message)
    return []
  }
})


// 2️⃣ GET ACTIVITIES BY TYPE
ipcMain.handle("get-activities-by-type", (event, type) => {
  try {
    const stmt = db.prepare(`
      SELECT
        ta.id,
        ta.activity_name,
        ta.level,
        ta.pdf_url,
        ta.video_url,
        ta.activity_order
      FROM tutorial_activity ta
      JOIN tutorial_master tm
        ON tm.id = ta.tutorial_id
      WHERE UPPER(tm.type) = ?
      ORDER BY ta.activity_order
    `)

    return stmt.all(type.toUpperCase())
  } catch (err) {
    console.error("ACTIVITY ERROR:", err.message)
    return []
  }
})


// 3️⃣ GET BLOCKS BY TUTORIAL ID
ipcMain.handle("get-blocks-by-tutorial", (event, tutorialId) => {
  try {
    const stmt = db.prepare(`
      SELECT
        id,
        block_type,
        block_order,
        block_config,
        parent_id
      FROM tutorial_blocks
      WHERE tutorial_id = ?
      ORDER BY block_order
    `)

    return stmt.all(tutorialId)
  } catch (err) {
    console.error("BLOCK ERROR:", err.message)
    return []
  }
})


// 4️⃣ GET PROJECTS BY USER ID
ipcMain.handle("get-projects", (event, userId) => {
  try {
    const stmt = db.prepare(`
      SELECT
        projectid,
        projectname,
        createdon
      FROM projectmaster
      WHERE userid = ?
      ORDER BY createdon DESC
    `)

    return stmt.all(userId)
  } catch (err) {
    console.error("GET PROJECT ERROR:", err.message)
    return []
  }
})


// 5️⃣ CREATE PROJECT
ipcMain.handle("create-project", (event, { projectName, userId }) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO projectmaster
        (projectname, userid, createdby, createdon, status)
      VALUES
        (?, ?, ?, datetime('now'), 1)
    `)

    const result = stmt.run(projectName, userId, userId)

    return {
      success: true,
      projectId: result.lastInsertRowid,
    }
  } catch (err) {
    console.error("CREATE PROJECT ERROR:", err.message)
    return { success: false }
  }
})


// 6️⃣ DELETE PROJECT
ipcMain.handle("delete-project", (event, projectId) => {
  try {
    const stmt = db.prepare(`
      DELETE FROM projectmaster
      WHERE projectid = ?
    `)

    stmt.run(projectId)

    return { success: true }
  } catch (err) {
    console.error("DELETE PROJECT ERROR:", err.message)
    return { success: false }
  }
})


// 7️⃣ LOGOUT (just return success, frontend clears token)
ipcMain.handle("logout-user", () => {
  return { success: true }
})

// GET PROJECT BLOCKS
ipcMain.handle("get-project-blocks", (event, projectId) => {
  try {
    const stmt = db.prepare(`
      SELECT
        id,
        block_type,
        block_order,
        block_config,
        parent_id
      FROM tutorial_blocks
      WHERE tutorial_id = ?
      ORDER BY block_order
    `)

    return stmt.all(projectId)
  } catch (err) {
    console.error("PROJECT BLOCK ERROR:", err.message)
    return []
  }
})

// 8️⃣ COMPILE MAKECODE (Local Offline Compilation)
ipcMain.handle("compile-makecode", async (event, { mainTs, projectName }) => {
  try {
    // Note: This requires pxt-core and pxt-microbit to be installed
    const pxt = require("pxt-core");
    const target = "microbit";
    
    // Set up PXT environment for local compilation
    if (!pxt.appTarget) {
      // Load the microbit target if not already loaded
      // This is a simplified version; real PXT setup might require more configuration
      pxt.setAppTarget({
        id: target,
        name: "Microsoft MakeCode for micro:bit",
        // ... other target config would go here ...
      });
    }

    const files = {
      "main.ts": mainTs,
      "pxt.json": JSON.stringify({
        name: projectName || "microbit-project",
        dependencies: {
          core: "*",
          microbit: "*"
        },
        files: ["main.ts"]
      })
    };

    // For a truly offline setup, we would use pxt.main.compileAsync
    // However, since PXT is a complex dependency, we will attempt to 
    // use a local compilation route if available, or fall back to a 
    // more detailed error message if the local packages are missing.
    
    // IMPLEMENTATION NOTE: Real offline PXT compilation requires a 
    // complex set of cached packages. For now, we provide the structure 
    // and instruct the user on the necessary environment setup.
    
    return { 
      success: false, 
      message: "Local PXT compiler requires 'pxt-microbit' and 'pxt-core' to be fully configured in the main process. Please ensure these are installed and the target is built." 
    };
  } catch (err) {
    console.error("LOCAL COMPILE ERROR:", err.message);
    return { success: false, message: "Local compiler packages not found. Run 'npm install pxt-core pxt-microbit'." };
  }
})
  await createWindow()
})

// ----------------------------
// CLOSE APP
// ----------------------------
app.on("window-all-closed", () => {
  if (staticServer) {
    staticServer.close()
    staticServer = null
  }
  if (process.platform !== "darwin") {
    app.quit()
  }
})
