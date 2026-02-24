const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const Database = require("better-sqlite3")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

let mainWindow
let db

// ----------------------------
// CREATE WINDOW
// ----------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged

if (isDev) {
  mainWindow.loadURL("http://localhost:3000")
} else {
  const serverPath = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    ".next",
    "standalone",
    "server.js"
  )

  console.log("Starting Next server from:", serverPath)

  try {
    require(serverPath)
  } catch (err) {
    console.error("Failed to start Next server:", err)
  }

  setTimeout(() => {
    mainWindow.loadURL("http://localhost:3000")
  }, 3000)
}

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// ----------------------------
// APP READY
// ----------------------------
app.whenReady().then(() => {
  // ✅ Setup SQLite inside Electron ONLY
  const dbPath = path.join(app.getPath("userData"), "database.sqlite")
  db = new Database(dbPath)

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

  createWindow()
})

// ----------------------------
// CLOSE APP
// ----------------------------
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})