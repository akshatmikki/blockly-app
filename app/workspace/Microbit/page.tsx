import { Suspense } from "react";
import BlocklyEditorClient from "./blockly-editor-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Blockly editor...</div>}>
      <BlocklyEditorClient />
    </Suspense>
  );
}
