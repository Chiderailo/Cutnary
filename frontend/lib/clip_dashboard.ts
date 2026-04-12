/** Session flag: after auth, scroll user to the clip / URL upload section on `/dashboard`. */
export const CLIP_DASHBOARD_SCROLL_KEY = 'cutnary_scroll_clip_dashboard'

export const CLIP_DASHBOARD_SECTION_ID = 'clip-dashboard'

export function requestClipDashboardScroll() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CLIP_DASHBOARD_SCROLL_KEY, '1')
  }
}
