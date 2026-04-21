import TutorialActivitiesPage from "./TutorialActivitiesClient"

export default function Page() {
  return <TutorialActivitiesPage />
}

export async function generateStaticParams() {
  return [
    { type: "BASIC" },
    { type: "AI" },
    { type: "STEMBOT" },
  ]
}