import ResetPasswordClient from "./resetpasswordclient";

export default function Page() {
  return <ResetPasswordClient />;
}

export async function generateStaticParams() {
  // ⚠️ Must return possible user IDs at build time
  return [
    { "user-id": "1" },
    { "user-id": "2" },
    { "user-id": "3" },
  ];
}