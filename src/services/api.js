const BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('dc_token') || sessionStorage.getItem('dc_token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`)
  return data
}

export const api = {
  // Auth
  login:    (username, password) => request('POST', '/auth/login', { username, password }),
  register: (first_name, last_name, username, email, password) =>
    request('POST', '/auth/register', { first_name, last_name, username, email, password }),
  me:            () => request('GET', '/auth/me'),
  updateProfile: (data) => request('PATCH', '/auth/profile', data),

  // Groups
  createGroup:      (name)                        => request('POST', '/groups', { name }),
  getGroups:        ()                            => request('GET', '/groups'),
  updateGroup:      (id, name, description)       => request('PATCH', `/groups/${id}`, { name, description }),
  deleteGroup:      (id)                          => request('DELETE', `/groups/${id}`),
  getMembers:       (groupId)                     => request('GET', `/groups/${groupId}/members`),
  addMember:        (groupId, unique_code, role)  => request('POST', `/groups/${groupId}/members`, { unique_code, role }),
  changeMemberRole: (groupId, userId, role)       => request('PATCH', `/groups/${groupId}/members/${userId}`, { role }),
  removeMember:     (groupId, userId)             => request('DELETE', `/groups/${groupId}/members/${userId}`),
  leaveGroup:       (id)                          => request('POST', `/groups/${id}/leave`),
  markGroupRead:    (id)                          => request('POST', `/groups/${id}/read`),

  // Message reads
  getMessageReads:  (msgId) => request('GET', `/group-messages/${msgId}/reads`),

  // Group messages (group conversation)
  getGroupMessages:  (groupId)          => request('GET', `/group-messages?group_id=${groupId}`),
  sendGroupMessage:  (groupId, content) => request('POST', '/group-messages', { group_id: groupId, content }),
  editGroupMessage:  (id, content)      => request('PATCH', `/group-messages/${id}`, { content }),
  pinMessage:        (groupId, msgId)   => request('POST', `/groups/${groupId}/pin`, { message_id: msgId }),
  unpinMessage:      (groupId)          => request('DELETE', `/groups/${groupId}/pin`),

  // Trips (will be integrated into group conversations later)
  getTrips:         (groupId, status) => request('GET', `/trips?group_id=${groupId}${status ? `&status=${status}` : ''}`),
  createTrip:       (data)            => request('POST', '/trips', data),
  updateTripStatus: (tripId, status)  => request('PATCH', `/trips/${tripId}/status`, { status }),

  // Direct messages
  getDmConversations: ()                => request('GET', '/dm'),
  startDm:            (other_user_id)   => request('POST', '/dm', { other_user_id }),
  startDmByCode:      (invite_code)     => request('POST', '/dm', { invite_code }),
  getDmMessages:      (convId)          => request('GET', `/dm/${convId}/messages`),
  sendDmMessage:      (convId, content) => request('POST', `/dm/${convId}/messages`, { content }),
  markDmRead:         (convId)          => request('POST', `/dm/${convId}/read`),
  getUnreads:         ()                => request('GET', '/dm/unreads'),

  // Users
  searchUsers: (q) => request('GET', `/users/search?q=${encodeURIComponent(q)}`),
}
