/**
 * v1.7: 埋点系统
 * 前端埋点 SDK + 事件定义
 */

// 埋点事件常量
export const TRACKING_EVENTS = {
  // 落地页
  LANDING_PAGE_VIEW: "landing_page_view",
  LANDING_START_CLICK: "landing_start_click",

  // 测评页
  QUIZ_START: "quiz_start",
  QUIZ_ANSWER: "quiz_answer",
  QUIZ_SUBMIT: "quiz_submit",
  QUIZ_ABANDON: "quiz_abandon",

  // 结果页
  RESULT_PAGE_VIEW: "result_page_view",
  RESULT_DETAIL_EXPAND: "result_detail_expand",
  RESULT_CONTACT_CLICK: "result_contact_click",
  RESULT_QR_SCAN: "result_qr_scan",

  // 助教端
  COACH_CUSTOMER_VIEW: "coach_customer_view",
  COACH_SCRIPT_COPY: "coach_script_copy",
  COACH_FOLLOWUP_CREATE: "coach_followup_create",
  COACH_TAG_ADD: "coach_tag_add",

  // Admin端
  ADMIN_DASHBOARD_VIEW: "admin_dashboard_view",
} as const;

export type TrackingEvent = (typeof TRACKING_EVENTS)[keyof typeof TRACKING_EVENTS];

// Session ID 管理
let sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  if (!sessionId) {
    // 尝试从 sessionStorage 获取
    sessionId = sessionStorage.getItem("tracking_session_id");
    if (!sessionId) {
      // 生成新的 session ID
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem("tracking_session_id", sessionId);
    }
  }
  return sessionId;
}

// 获取邀请 token（从 URL 或 localStorage）
function getInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  
  // 从 URL 获取
  const match = window.location.pathname.match(/\/t\/([^/]+)/);
  if (match) return match[1];
  
  // 从 localStorage 获取
  return localStorage.getItem("current_invite_token");
}

// 设置当前邀请 token
export function setInviteToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("current_invite_token", token);
}

/**
 * 发送埋点事件
 * @param event 事件名称
 * @param properties 附加属性
 */
export function track(
  event: TrackingEvent | string,
  properties?: Record<string, any>
): void {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    properties,
    sessionId: getSessionId(),
    inviteToken: getInviteToken(),
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer || null,
  };

  // 使用 sendBeacon 确保页面关闭时也能发送
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/tracking", JSON.stringify(payload));
  } else {
    // 降级到 fetch
    fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // 静默失败
    });
  }
}

/**
 * 页面浏览埋点（自动获取页面信息）
 */
export function trackPageView(pageName: string, properties?: Record<string, any>): void {
  track(`${pageName}_view`, {
    ...properties,
    pageTitle: typeof document !== "undefined" ? document.title : undefined,
  });
}
