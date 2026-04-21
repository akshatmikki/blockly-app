"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const modules = [
  { title: "Basic\nCoding", description: "Let's learn the basics of Python.", color: "bg-red-800", textColor: "text-black", href: "/workspace/basic-coding" },
  { title: "AI\nCoding", description: "Unlock ML & AI.", color: "bg-purple-700", textColor: "text-white", href: "/workspace/ai-coding" },
  { title: "Tinker Orbits\nCoding", description: "Explore technology.", color: "bg-amber-800", textColor: "text-white", href: "/workspace/tinker-orbits" },
  { title: "STEMBOT\nCoding", description: "NLP & ML.", color: "bg-blue-600", textColor: "text-white", href: "/workspace/stembot" },
  { title: "STEM\nLIGHT", description: "STEM concepts.", color: "bg-indigo-900", textColor: "text-white", href: "/workspace/stem-light" },
  { title: "MIT APP\nInventor", description: "Create apps.", color: "bg-red-700", textColor: "text-white", href: "/workspace/mit-app" },
  { title: "Blockly\nGames", description: "Learn with games.", color: "bg-violet-600", textColor: "text-white", href: "/workspace/blockly-games" },
  { title: "Jupyter\nNotebook", description: "Data science.", color: "bg-orange-600", textColor: "text-white", href: "/workspace/jupyter" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [tutorialCounts, setTutorialCounts] = useState<Record<string, number>>({})
  const [userEmail, setUserEmail] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [activeTab, setActiveTab] = useState<"PROJECTS" | "TUTORIALS">("PROJECTS");
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined" && window.electronAPI) {
        await window.electronAPI.logoutUser();
      } else {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      localStorage.clear();
      router.push("/login");
    }
  };

  //  const handleResetPassword = async () => {
  //   const userId = localStorage.getItem("userId")

  //   const res = await fetch("/api/admin/reset_password", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       userId,
  //       newPassword: password,
  //     }),
  //   })

  //   const data = await res.json()
  //   setMessage(data.message)

  //   if (res.ok) {
  //     setTimeout(() => router.push("/login"), 1500)
  //   }
  // }

  /* ---------- LOAD PROJECTS ---------- */
  const loadProjects = async () => {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    setProjects([]);
    return;
  }

  try {
    if (typeof window !== "undefined" && !window.electronAPI) {
      console.error("Electron API not found");
      setProjects([]);
      return;
    }
    const data = await window.electronAPI.getProjects(Number(userId));

    if (Array.isArray(data)) {
      setProjects(data);
    } else {
      console.error("Expected array, got:", data);
      setProjects([]);
    }
  } catch (err) {
    console.error("Load projects failed", err);
    setProjects([]);
  }
};
  const handleBackFromCreate = () => {
    if (projects.length > 0) {
      setIsCreatingNewProject(false);
      setProjectName("");
    } else {
      setShowModal(false);
      setProjectName("");
      setIsCreatingNewProject(false);
    }
  };

 const loadTutorialCounts = async () => {
  try {
    if (typeof window !== "undefined" && !window.electronAPI) {
      console.error("Electron API not found");
      return;
    }
    const data = await window.electronAPI.getTutorialCounts();

    const mapped: Record<string, number> = {};

    data.forEach((row: any) => {
      mapped[row.type] = Number(row.tutorial_count);
    });

    setTutorialCounts(mapped);
  } catch (err) {
    console.error("Failed to load tutorial counts", err);
  }
};

  /* ---------- AUTH ---------- */
  useEffect(() => {
    const email = localStorage.getItem("userEmail")
    if (!email) router.push("/login")
    else {
      setUserEmail(email)
      loadProjects()
      loadTutorialCounts() // 👈 ADD THIS
    }
  }, [])

  /* ---------- CREATE PROJECT ---------- */
  const createProjectAndRedirect = async () => {
  const userId = localStorage.getItem("userId");

  if (!projectName.trim()) {
    alert("Project name required");
    return;
  }

  try {
    if (typeof window !== "undefined" && !window.electronAPI) {
      alert("This feature is only available in the Desktop application.");
      return;
    }
    const response = await window.electronAPI.createProject({
      projectName,
      userId: Number(userId),
    });

    if (!response?.success) {
      alert("Failed to create project");
      return;
    }

    // ✅ success
    await loadProjects(); // Refresh projects so the back-navigation cache has the latest
    setShowModal(false);
    setProjectName("");
    setIsCreatingNewProject(false);

    router.push(
      `${selectedModule.href}?projectId=${response.projectId}`
    );

  } catch (error) {
    console.error("Create project failed:", error);
    alert("Failed to create project");
  }
};

  /* ---------- SELECT PROJECT ---------- */
  const openProject = (projectId: number) => {
    setShowModal(false);
    router.push(`${selectedModule.href}?projectId=${projectId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-950 to-blue-900 text-white px-6 py-4 flex justify-between">
        <h1 className="text-2xl font-light">
          AIConnecto | <span className="font-normal">User Dashboard</span>
        </h1>
        <div className="relative">
          <div
            className="text-sm flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            {userEmail}
            <ChevronRight
              className={`w-4 h-4 transition-transform ${showProfileMenu ? "rotate-90" : ""
                }`}
            />
          </div>

          {/* Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-white text-black rounded-xl shadow-lg border overflow-hidden z-50">
              {/* <button
                onClick={handleResetPassword}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm"
              >
                🔑 Reset Password
              </button> */}

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Modules */}
      <main className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {modules.map((module, index) => (
            <div
              key={index}
              className={`${module.color} ${module.textColor} rounded-2xl p-8 flex flex-col justify-between min-h-[320px] shadow-lg`}
            >
              <div>
                <h3 className="text-3xl font-light mb-4 whitespace-pre-line">
                  {module.title}
                </h3>
                <p>{module.description}</p>
              </div>

              <Button
                className="mt-6 bg-white text-black hover:bg-gray-100 w-full"
                onClick={() => {
                  setSelectedModule(module);
                  setIsCreatingNewProject(true);
                  setShowModal(true);
                }}
              >
                Create <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-medium mb-4">
              {projects.length === 0 ? "Create Project" : "Select Project"}
            </h3>

            {/* IF NO PROJECTS */}
            {/* CREATE MODE */}
            {projects.length === 0 || isCreatingNewProject ? (
              <>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project Name"
                  className="w-full border px-3 py-2 rounded mb-4"
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-1/2"
                    onClick={handleBackFromCreate}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <Button
                    onClick={createProjectAndRedirect}
                    className="w-1/2"
                    disabled={!projectName.trim()}
                  >
                    Create & Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                {projects.map((p) => (
                  <div
                    key={p.projectid ?? p.ProjectId}
                    className="border rounded p-3 mb-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => openProject(p.projectid ?? p.ProjectId)}
                  >
                    {p.projectname ?? p.ProjectName}
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => setIsCreatingNewProject(true)}
                >
                  + Create New Project
                </Button>
              </>
            )}

          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mt-24 px-6 pb-20">
        <h2 className="text-4xl font-light text-center mb-12">
          Your Workspace
        </h2>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-8 border">
          <div
            className={`flex-1 text-center py-4 font-semibold cursor-pointer ${activeTab === "PROJECTS"
              ? "bg-blue-950 text-white border-b-4 border-pink-500"
              : "bg-blue-800 text-white"
              }`}
            onClick={() => setActiveTab("PROJECTS")}
          >
            PROJECTS
          </div>

          <div
            className={`flex-1 text-center py-4 font-semibold cursor-pointer ${activeTab === "TUTORIALS"
              ? "bg-blue-950 text-white border-b-4 border-pink-500"
              : "bg-blue-800 text-white"
              }`}
            onClick={() => setActiveTab("TUTORIALS")}
          >
            TUTORIALS
          </div>
        </div>

        {/* ================= PROJECTS TAB ================= */}
        {activeTab === "PROJECTS" && (
          <>
            {projects.length === 0 ? (
              <div className="text-gray-500 text-lg text-center py-20">
                No projects created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div
                    key={project.projectid ?? project.ProjectId}
                    className="border rounded-xl p-5 shadow-sm hover:shadow-md cursor-pointer transition"
                    onClick={() =>
                      router.push(
                        `/workspace/basic-coding?projectId=${project.projectid ?? project.ProjectId
                        }`
                      )
                    }
                  >
                    <h3 className="text-xl font-medium mb-2">
                      {project.projectname ?? project.ProjectName}
                    </h3>

                    <p className="text-sm text-gray-500">
                      Created on{" "}
                      {new Date(
                        project.createdon ?? project.CreatedOn
                      ).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= TUTORIALS TAB ================= */}
        {activeTab === "TUTORIALS" && (
          <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-white border-b">
                <tr>
                  <th className="text-left px-6 py-4 w-16">#</th>
                  <th className="text-left px-6 py-4">Example Name</th>
                  <th className="text-right px-6 py-4">Count</th>
                </tr>
              </thead>

              <tbody>
                {[
                  { id: 1, name: "Basic Coding", key: "BASIC" },
                  { id: 2, name: "AI Coding", key: "AI" },
                  { id: 3, name: "STEMBOT Coding", key: "STEMBOT" },
                ].map((item, index) => (
                  <tr
                    key={item.id}
                    className={index % 2 === 0 ? "bg-gray-100" : "bg-white"}
                  >
                    <td className="px-6 py-4 font-medium">{item.id}</td>
                    <td
                      className="px-6 py-4 text-blue-600 cursor-pointer hover:underline"
                      onClick={() => router.push(`/tutorials/${item.key}`)}
                    >
                      {item.name}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="inline-block bg-blue-800 text-white text-sm px-3 py-1 rounded-md">
                        {tutorialCounts[item.key] ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
