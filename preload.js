const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  loginUser: (credentials) =>
    ipcRenderer.invoke("login-user", credentials),
  getTutorialCounts: () =>
    ipcRenderer.invoke("get-tutorial-counts"),

  getActivitiesByType: (type) =>
    ipcRenderer.invoke("get-activities-by-type", type),

  getBlocksByTutorial: (id) =>
    ipcRenderer.invoke("get-blocks-by-tutorial", id),

  getProjectBlocks: (id) =>
  ipcRenderer.invoke("get-project-blocks", id),

  getProjects: (userId) =>
    ipcRenderer.invoke("get-projects", userId),

  createProject: (data) =>
    ipcRenderer.invoke("create-project", data),

  deleteProject: (projectId) =>
    ipcRenderer.invoke("delete-project", projectId),

  logoutUser: () =>
    ipcRenderer.invoke("logout-user"),
})