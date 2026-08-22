import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, MessageCircle, Paperclip, Search, Send, UserCircle2 } from 'lucide-react';
import { chatService, ChatConversation, ChatMessage } from '../services/chatService';
import { piAuthService } from '../services/piAuthService';

export const ChatView: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState('');
  const currentUid = piAuthService.getStoredUser()?.uid || '';

  const loadConversations = async () => {
    setError('');
    try { setConversations(await chatService.getConversations(search)); }
    catch (e: any) { setError(e?.message || 'Unable to load conversations.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { loadConversations(); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const openConversation = async (conversation: ChatConversation) => {
    setSelected(conversation); setMessageLoading(true); setError('');
    try { const loaded = await chatService.getMessages(conversation.id); setMessages(loaded); await chatService.markRead(conversation.id); setConversations((items) => items.map((item) => item.id === conversation.id ? { ...item, unread_count: 0 } : item)); }
    catch (e: any) { setError(e?.message || 'Unable to load this conversation.'); }
    finally { setMessageLoading(false); }
  };

  const send = async () => {
    const text = draft.trim(); if (!text || !selected || messageLoading) return;
    setMessageLoading(true); setError('');
    try { const message = await chatService.sendMessage(selected.id, text); setMessages((items) => [...items, message]); setDraft(''); await loadConversations(); }
    catch (e: any) { setError(e?.message || 'Unable to send message.'); }
    finally { setMessageLoading(false); }
  };

  const selectedName = selected?.other_username || selected?.other_name || 'Conversation';
  const groupedMessages = useMemo(() => messages, [messages]);

  if (selected) return (
    <section className="w-full min-h-[520px] flex flex-col rounded-3xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
      <header className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-zinc-100 bg-white">
        <button onClick={() => { setSelected(null); setMessages([]); loadConversations(); }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-zinc-50" aria-label="Back to chats"><ArrowLeft className="w-5 h-5" /></button>
        {selected.other_photo_url ? <img src={selected.other_photo_url} alt="" className="w-9 h-9 rounded-full object-cover" /> : <UserCircle2 className="w-9 h-9 text-zinc-300" />}
        <div className="min-w-0"><div className="font-black text-sm truncate">@{String(selectedName).replace(/^@+/, '')}</div><div className="text-[11px] text-zinc-500">{selected.other_username ? 'Provider / Client' : 'Booking contact'}</div></div>
      </header>
      <div className="flex-1 min-h-[360px] overflow-y-auto bg-zinc-50/60 p-4 space-y-3">
        {messageLoading && groupedMessages.length === 0 && <div className="text-center text-xs text-zinc-400 py-10">Loading conversation…</div>}
        {groupedMessages.map((message) => message.message_type === 'system' ? <div key={message.id} className="mx-auto max-w-sm rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 text-center text-[11px] font-semibold text-orange-900">{message.content}</div> : <div key={message.id} className={`flex ${message.sender_pi_uid === currentUid ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.sender_pi_uid === currentUid ? 'bg-orange-600 text-white rounded-br-md' : 'bg-white text-zinc-800 border border-zinc-100 rounded-bl-md shadow-xs'}`}><div>{message.content}</div><div className={`mt-1 flex items-center gap-1 text-[9px] ${message.sender_pi_uid === currentUid ? 'text-orange-100 justify-end' : 'text-zinc-400'}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{message.sender_pi_uid === currentUid && <CheckCheck className="w-3 h-3" />}</div></div></div>)}
        {!messageLoading && groupedMessages.length === 0 && <div className="text-center text-xs text-zinc-400 py-10">No messages yet.</div>}
      </div>
      {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>}
      <div className="shrink-0 p-3 border-t border-zinc-100 bg-white flex items-center gap-2">
        <button type="button" className="w-10 h-10 rounded-xl bg-zinc-50 text-zinc-500 flex items-center justify-center" title="Attachments coming later"><Paperclip className="w-4 h-4" /></button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message…" className="flex-1 h-10 px-3 rounded-xl bg-zinc-50 border border-transparent focus:border-orange-200 focus:outline-none text-sm" />
        <button type="button" onClick={send} disabled={!draft.trim() || messageLoading} className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center disabled:opacity-40"><Send className="w-4 h-4" /></button>
      </div>
    </section>
  );

  return (
    <section className="w-full min-h-[520px] rounded-3xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
      <header className="h-16 flex items-center justify-between gap-3 px-4 border-b border-zinc-100">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div><h1 className="text-lg font-black">Chat</h1></div>
        <button type="button" onClick={async () => { for (const item of conversations.filter((c) => c.unread_count > 0)) await chatService.markRead(item.id); await loadConversations(); }} className="text-xs font-bold text-orange-600 inline-flex items-center gap-1"><CheckCheck className="w-4 h-4" /> Mark all read</button>
      </header>
      <div className="p-4 border-b border-zinc-100"><div className="h-11 rounded-xl bg-zinc-50 flex items-center gap-2 px-3"><Search className="w-4 h-4 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by Pi username…" className="flex-1 bg-transparent outline-none text-sm" /></div></div>
      {error && <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</div>}
      <div className="divide-y divide-zinc-100">
        {loading ? <div className="py-16 text-center text-xs text-zinc-400">Loading conversations…</div> : conversations.length === 0 ? <div className="py-16 px-6 text-center"><MessageCircle className="w-8 h-8 mx-auto text-zinc-300 mb-3" /><h2 className="text-sm font-black text-zinc-800">No conversations yet</h2><p className="text-xs text-zinc-500 mt-1">Your booking conversations will appear here after a provider accepts a booking.</p></div> : conversations.map((conversation) => <button key={conversation.id} onClick={() => openConversation(conversation)} className="w-full text-left flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 transition"><div className="shrink-0">{conversation.other_photo_url ? <img src={conversation.other_photo_url} alt="" className="w-11 h-11 rounded-full object-cover" /> : <UserCircle2 className="w-11 h-11 text-zinc-300" />}</div><div className="min-w-0 flex-1"><div className={`text-sm truncate ${conversation.unread_count ? 'font-black text-zinc-950' : 'font-bold text-zinc-800'}`}>@{String(conversation.other_username || conversation.other_name).replace(/^@+/, '')}</div><div className={`text-xs truncate mt-0.5 ${conversation.unread_count ? 'font-semibold text-zinc-700' : 'text-zinc-500'}`}>{conversation.last_message || 'No messages yet'}</div></div><div className="shrink-0 text-right flex flex-col items-end gap-1"><div className="text-[10px] text-zinc-400">{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</div>{conversation.unread_count > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center">{conversation.unread_count}</span>}</div></button>)}
      </div>
    </section>
  );
};
