const BASE = import.meta.env.VITE_API_BASE_URL || 'https://mock.api.local'

export async function fetchUser() {
  // mock behavior for Sprint 1
  return new Promise((resolve) => setTimeout(() => resolve({ id: 'u_1', name: 'Mock User', email: 'mock@example.com' }), 300))
}

export async function createMeeting(data: { title: string }) {
  return new Promise((resolve) => setTimeout(() => resolve({ meetingId: 'm_' + Date.now(), ...data }), 300))
}

export async function joinMeeting(meetingId: string) {
  return new Promise((resolve) => setTimeout(() => resolve({ meetingId, joinedAt: new Date().toISOString() }), 300))
}

// Web fetch wrapper (not used yet) showing how to integrate an API on Render
export async function apiGet(path: string) {
  const url = `${BASE}${path}`
  // For sprint 1 we keep this as a transparent wrapper to be replaced later.
  return fetch(url).then(r => r.json())
}
