export {}

declare global {
  interface Window {
    electronAPI: {
      loginUser: (data: any) => Promise<any>
      getTutorialCounts: () => Promise<any>
      getActivitiesByType: (type: string) => Promise<any>
      getProjects: (userId: number) => Promise<any>
      createProject: (data: any) => Promise<any>
      deleteProject: (projectId: number) => Promise<any>
      getBlocksByTutorial: (tutorialId: number) => Promise<any>
      getProjectBlocks: (projectId: number) => Promise<any>
      logoutUser: () => Promise<any>
      resetPassword: (data: {
        userId: number
        newPassword: string
      }) => Promise<any>
    }
  }
}