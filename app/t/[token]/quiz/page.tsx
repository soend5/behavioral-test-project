export default function QuizPage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">测评题目</h1>
        <p className="text-gray-600">题目页（待实现）</p>
        <p className="text-sm text-gray-400 mt-4">Token: {params.token}</p>
      </div>
    </div>
  );
}

