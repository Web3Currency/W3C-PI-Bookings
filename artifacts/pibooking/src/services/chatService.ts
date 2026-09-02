import { piAuthService } from './piAuthService';
import { chatLocalStore, LocalConversation, LocalMessage } from './chatLocalStore';
const API_BASE = '/api';
async function request<T>(path: string, body: Record<string, unknown>): Promise<T> { const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Chat request failed.'); return payload as T; }
function authBody(extra: Record<string, unknown> = {}) { const user = piAuthService.getStoredUser(); if (!user?.accessToken) throw new Error('Please sign in with Pi to use Chat.'); return { accessToken: user.accessToken, ...extra }; }
export type ChatConversation = { id: string; booking_id: string | null; other_pi_uid: string; other_name: string; other_username?: string | null; other_photo_url?: string | null; other_role?: 'client' | 'provider' | null; last_message?: string | null; last_message_type?: 'user' | 'system' | null; last_message_at?: string | null; unread_count: number; updated_at: string; booking_status?: string | null; project_deadline?: string | null; };
export type ChatParticipant = { other_pi_uid: string; other_role: 'client' | 'provider'; other_name: string; other_username?: string | null; other_photo_url?: string | null; };
export type ChatMessage = { id: string; conversation_id: string; booking_id: string; sender_pi_uid: string; message_type: 'user' | 'system'; content: string; created_at: string; };
export type ChatBookingContext = { id: string; status: string | null; project_deadline: string | null; service_title: string; provider_pi_uid: string; };
export type ChatPage = { messages: ChatMessage[]; hasMore: boolean; nextCursor: { createdAt: string; id: string } | null; };
const toLocalConversation = (conversation: ChatConversation): Omit<LocalConversation, 'cached_at'> => ({ ...conversation });
const toLocalMessage = (message: ChatMessage): LocalMessage => ({ ...message, sync_status: message.id.startsWith('pending-') ? 'pending' : 'sent' });
const fromLocalMessage = (message: LocalMessage): ChatMessage => ({ id: message.id, conversation_id: message.conversation_id, booking_id: message.booking_id, sender_pi_uid: message.sender_pi_uid, message_type: message.message_type, content: message.content, created_at: message.created_at });
export const chatService = {
 async getCachedConversations(): Promise<ChatConversation[]> { return (await chatLocalStore.getConversations()) as ChatConversation[]; },
 async getConversations(): Promise<ChatConversation[]> { const data=await request<{conversations:ChatConversation[]}>('/pi/chat/conversations',authBody()); const conversations=data.conversations||[]; await chatLocalStore.putConversations(conversations.map(toLocalConversation)); return conversations; },
 async getConversationForBooking(bookingId:string) { return request<{conversationId:string;bookingId:string;bookingStatus:string;projectDeadline?:string|null;participant:ChatParticipant}>('/pi/chat/conversations/for-booking',authBody({bookingId})); },
 async getCachedMessages(conversationId:string):Promise<ChatMessage[]> { return (await chatLocalStore.getMessages(conversationId)).map(fromLocalMessage); },
 async getMessagesPage(conversationId:string, options:{limit?:number;before?:{createdAt:string;id:string}|null}={}):Promise<ChatPage> { const data=await request<ChatPage>(`/pi/chat/conversations/${encodeURIComponent(conversationId)}/messages/list`,authBody({limit:options.limit??50,beforeCreatedAt:options.before?.createdAt??null,beforeId:options.before?.id??null})); await chatLocalStore.putMessages((data.messages||[]).map(toLocalMessage)); return data; },
 async getMessages(conversationId:string):Promise<ChatMessage[]> { const data=await this.getMessagesPage(conversationId,{limit:50}); return data.messages||[]; },
 async getBookingContexts(conversationId:string):Promise<ChatBookingContext[]> { const data=await request<{bookings:ChatBookingContext[]}>(`/pi/chat/conversations/${encodeURIComponent(conversationId)}/bookings`,authBody()); return data.bookings||[]; },
 async cacheMessage(message:ChatMessage, sync_status:LocalMessage['sync_status']='sent'):Promise<void> { await chatLocalStore.putMessage({ ...message, sync_status }); },
 async removeCachedMessage(id:string):Promise<void> { await chatLocalStore.deleteMessage(id); },
 async sendMessage(conversationId:string,bookingId:string,content:string):Promise<ChatMessage> { const data=await request<{message:ChatMessage}>(`/pi/chat/conversations/${encodeURIComponent(conversationId)}/messages`,authBody({bookingId,content})); const message=data.message; await chatLocalStore.putMessage(toLocalMessage(message)); return message; },
 async markRead(conversationId:string):Promise<void> { await request(`/pi/chat/conversations/${encodeURIComponent(conversationId)}/read`,authBody()); },
};
