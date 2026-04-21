"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const AICodingPage = dynamic(
  () => import("./ai-coding-client"),
  { ssr: false }
);

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AICodingPage />
    </Suspense>
  );
}
