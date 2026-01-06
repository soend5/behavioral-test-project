export default function InviteLandingPage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">欢迎参加测评</h1>
        <p className="text-gray-600 mb-6">邀请落地页（待实现）</p>
        <p className="text-sm text-gray-400">Token: {params.token}</p>
      </div>
    </div>
  );
}

