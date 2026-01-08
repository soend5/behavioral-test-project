import { Suspense } from "react";
import QuestionsClient from "./QuestionsClient";

export default function AdminQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-4">
            <div className="bg-white rounded-lg shadow p-6">加载中...</div>
          </div>
        </div>
      }
    >
      <QuestionsClient />
    </Suspense>
  );
}

