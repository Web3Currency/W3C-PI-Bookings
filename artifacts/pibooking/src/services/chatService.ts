import { piAuthService } from './piAuthService';

const API_BASE = '/api';

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Chat request failed.');
  return payload as T;
}

function authBody(extra: Record<string, unknown> = {}) {
  const user = piAuthService.getStoredUser();
  if (!user?.accessToken) throw new Error('Please sign in with Pi to use Chat.');
  return { accessToken: user.accessToken, ...extra };
}

export type ChatConversation = {
  id: string;
  booking_id: string;
  other_pi_uid: string;
  other_name: string;
  other_username?: string | null;
  other_photo_url?: string | null;
  last_message?: string | null;
  last_message_type?: 'user' | 'system' | null;
  last_message_at?: string | null;
  unread_count: number;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_pi_uid: string;
  message_type: 'user' | 'system';
  content: string;
  created_at: string;
};

export const chatService = {
  async getConversations(search = ''): Promise<ChatConversation[]> {
    const data = await request<{ conversations: ChatConversation[] }>('/pi/chat/conversations', authBody({ search }));
    return data.conversations || [];
  },
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const data = await request<{ messages: ChatMessage[] }>(`/pi/chat/conversations/${encodeURIComponent(conversationId)}/messages/list`, authBody());
    return data.messages || [];
  },
  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const data = await request<{ message: ChatMessage }>(`/pi/chat/conversations/${encodeURIComponent(conversationId)}/messages`, authBody({ content }));
    return data.message;
  },
  async markRead(conversationId: string): Promise<void> {
    await request(`/pi/chat/conversations/${encodeURIComponent(conversationId)}/read`, authBody());
  },
};
