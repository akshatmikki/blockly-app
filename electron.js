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
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // Development mode (when running npm run dev)
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // Production mode (fully offline)
    mainWindow.loadFile(
      path.join(__dirname, "../out/index.html")
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
// ----------------------------
// APP READY
// ----------------------------
app.whenReady().then(() => {
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