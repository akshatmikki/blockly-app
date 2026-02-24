const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  loginUser: (credentials) =>
    ipcRenderer.invoke("login-user", credentials),
})