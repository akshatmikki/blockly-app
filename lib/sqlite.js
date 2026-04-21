import Database from "better-sqlite3"
import path from "path"

let dbPath = "./database.sqlite"

// Detect if running inside Electron
const isElectron = !!process.versions.electron

if (isElectron) {
  const { app } = require("electron")
  dbPath = path.join(app.getPath("userData"), "database.sqlite")
}

const db = new Database(dbPath)

export default db