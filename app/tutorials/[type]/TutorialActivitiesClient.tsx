"use client";
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { FileText, Video } from "lucide-react"

const titleMap: Record<string, string> = {
  BASIC: "Basic Coding",
  AI: "AI Coding",
  STEMBOT: "STEMBOT Coding",
}

export default function TutorialActivitiesPage() {
  const { type } = useParams()
  const router = useRouter()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

 useEffect(() => {
  const loadActivities = async () => {
    try {
      const data = await window.electronAPI.getActivitiesByType(type);

      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load activities:", err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  if (type) {
    loadActivities();
  }
}, [type]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-6">
        <span className="text-blue-600">Tutorials</span> /{" "}
        <span className="font-medium">
          {titleMap[type as string] ?? type}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-gray-500 py-10">
          Loading activities...
        </div>
      )}

      {/* Empty */}
      {!loading && activities.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No activities found.
        </div>
      )}

      {/* Table */}
      {!loading && activities.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-4 text-left w-16">#</th>
                <th className="px-6 py-4 text-left">Activity Name</th>
                <th className="px-6 py-4 text-center">Level</th>
                <th className="px-6 py-4 text-center">PDF</th>
                <th className="px-6 py-4 text-center">Video</th>
              </tr>
            </thead>

            <tbody>
              {activities.map((a, index) => (
                <tr
                  key={a.id}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-6 py-4">{index + 1}</td>

                  {/* ✅ Clickable Activity Name */}
                  <td
                    className="px-6 py-4 text-blue-600 cursor-pointer hover:underline"
                    onClick={() =>
                      router.push(
                        `/workspace/${type?.toString().toLowerCase()}-coding?activityId=${a.id}`
                      )
                    }
                  >
                    {a.activity_name}
                  </td>

                  <td className="px-6 py-4 text-center">{a.level}</td>

                  <td className="px-6 py-4 text-center">
                    {a.pdf_url && (
                      <a href={a.pdf_url} target="_blank">
                        <FileText className="inline w-5 h-5" />
                      </a>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {a.video_url && (
                      <a href={a.video_url} target="_blank">
                        <Video className="inline w-5 h-5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>
  )
}