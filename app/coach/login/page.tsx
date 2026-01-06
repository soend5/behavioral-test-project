import { Suspense } from "react";
import CoachLoginClient from "./CoachLoginClient";

export default function CoachLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            加载中...
          </div>
        </div>
      }
    >
      <CoachLoginClient />
    </Suspense>
  );
}

