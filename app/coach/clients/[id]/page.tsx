export default function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">客户详情</h1>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-600">客户详情页（待实现）</p>
          <p className="text-sm text-gray-400 mt-4">客户ID: {params.id}</p>
        </div>
      </div>
    </div>
  );
}

