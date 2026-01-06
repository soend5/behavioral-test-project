export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            专业助教营销工具
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            为销售团队提供智能陪跑支持，提升客户沟通效率
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 mt-12">
            <h2 className="text-2xl font-semibold mb-4">产品说明</h2>
            <div className="text-left space-y-4 text-gray-700">
              <p>
                本工具专为助教（销售陪跑）团队设计，通过科学的测评体系帮助您更好地了解客户，
                并提供个性化的沟通策略建议。
              </p>
              <p>
                助教可以通过后台管理系统创建客户档案，生成专属邀请链接，并查看客户的测评结果
                和实时陪跑提示，从而提供更精准的销售支持。
              </p>
              <p className="text-sm text-gray-500 mt-6">
                如需使用本工具，请联系您的助教获取专属测评链接。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

