import { COMPLIANCE_NOTICE_CN, PRODUCT_NAME_CN, PRODUCT_TAGLINE_CN } from "@/lib/ui-copy";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900">
            {PRODUCT_NAME_CN}
          </h1>
          <p className="mt-4 text-lg text-gray-600">{PRODUCT_TAGLINE_CN}</p>

          <div className="mt-6 mx-auto max-w-2xl rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            {COMPLIANCE_NOTICE_CN}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">测评闭环</div>
            <p className="mt-2 text-sm text-gray-600">
              邀请链接 → 作答/提交 → 结果概览（只展示少量关键行为点）。
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">助教工作台</div>
            <p className="mt-2 text-sm text-gray-600">
              管理参与者档案与邀请，查看时间线，并获得可照读的 SOP 建议。
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">内容与配置</div>
            <p className="mt-2 text-sm text-gray-600">
              题库、画像文案、内训手册、方法论与 SOP 配置统一在后台维护。
            </p>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          如需参与测评，请向助教索取邀请链接。
        </div>
      </div>
    </div>
  );
}

