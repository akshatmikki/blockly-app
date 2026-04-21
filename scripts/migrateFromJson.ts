import fs from "fs"
import db from "../lib/sqlite.js"

function normalizeValue(value: any) {
  if (value === null || value === undefined) return null

  // Convert boolean → 1/0
  if (typeof value === "boolean") {
    return value ? 1 : 0
  }

  // Convert objects (like block_config) → JSON string
  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return value
}

function importFile(filePath: string, table: string) {
  const data = fs.readFileSync(filePath, "utf-8")
    .trim()
    .split("\n")
    .map(line => JSON.parse(line))

  const cleanedData = data.map(row => {
    delete row.PlainPassword
    return row
  })

  const keys = Object.keys(cleanedData[0])
  const placeholders = keys.map(() => "?").join(",")

  const stmt = db.prepare(
    `INSERT INTO ${table} (${keys.join(",")})
     VALUES (${placeholders})`
  )

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      const values = keys.map(key => normalizeValue(row[key]))
      stmt.run(values)
    }
  })

  insertMany(cleanedData)

  console.log(`Imported ${table}`)
}

importFile("./data/users.json", "users")
importFile("./data/projects.json", "projectmaster")
importFile("./data/tutorial_master.json", "tutorial_master")
importFile("./data/tutorial_activity.json", "tutorial_activity")
importFile("./data/tutorial_blocks.json", "tutorial_blocks")