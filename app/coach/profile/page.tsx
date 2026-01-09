"use client";

import { useEffect, useState } from "react";
import { CoachNav } from "../_components/CoachNav";
import { MobileNav } from "../_components/MobileNav";
import { csrfFetch } from "@/lib/csrf-client";

type CoachProfile = {
  id: string;
  username: string;
  name: string | null;
  wechatQrcode: string | null;
  status: string;
  createdAt: string;
  customerCount: number;
};

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

export default function CoachProfilePage() {
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 密码修改
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/profile", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<{ profile: CoachProfile }>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setProfile(json.data.profile);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      setError("请填写新密码");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setError("密码至少6位");
      return;
    }

    setChangingPassword(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/coach/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setSuccess("密码修改成功");
      setShowPasswordForm(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("修改失败");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <CoachNav />
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2">个人信息</h1>
        <p className="text-sm text-gray-600 mb-6">
          查看您的账号信息。如需修改显示名称或二维码，请联系管理员。
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">关闭</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3 text-sm mb-4">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-2 underline">关闭</button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">加载中...</div>
        ) : profile ? (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">账号信息</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">用户名</span>
                  <span className="font-medium">{profile.username}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">显示名称</span>
                  <span className="font-medium">
                    {profile.name || <span className="text-gray-400">未设置</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">账号状态</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    profile.status === "active" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {profile.status === "active" ? "正常" : "已停用"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">管理客户数</span>
                  <span className="font-medium">{profile.customerCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">注册时间</span>
                  <span className="text-gray-500">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 微信二维码 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">微信二维码</h2>
              {profile.wechatQrcode ? (
                <div className="text-center">
                  <img 
                    src={profile.wechatQrcode} 
                    alt="微信二维码" 
                    className="w-40 h-40 mx-auto object-contain border rounded"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    此二维码会显示在客户测评结果页面
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>暂未设置微信二维码</p>
                  <p className="text-sm mt-1">请联系管理员上传您的微信二维码</p>
                </div>
              )}
            </div>

            {/* 修改密码 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">安全设置</h2>
                {!showPasswordForm && (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    修改密码
                  </button>
                )}
              </div>
              
              {showPasswordForm && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      当前密码
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="输入当前密码"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      新密码
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="至少6位"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      确认新密码
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="再次输入新密码"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowPasswordForm(false);
                        setOldPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {changingPassword ? "修改中..." : "确认修改"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            无法加载个人信息
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
