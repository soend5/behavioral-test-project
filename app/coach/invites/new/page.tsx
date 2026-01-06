import { Suspense } from "react";
import NewInviteClient from "./NewInviteClient";

export default function NewInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-3xl mx-auto p-4">
            <div className="bg-white rounded-lg shadow-lg p-6">加载中...</div>
          </div>
        </div>
      }
    >
      <NewInviteClient />
    </Suspense>
  );
}

