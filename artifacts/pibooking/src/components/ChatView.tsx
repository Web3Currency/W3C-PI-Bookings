import React from 'react';
import { MessageCircle } from 'lucide-react';

export const ChatView: React.FC = () => (
  <section className="w-full min-h-[420px] flex items-center justify-center py-12">
    <div className="max-w-md text-center space-y-3">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
        <MessageCircle className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-black text-zinc-900">Chat</h1>
      <p className="text-sm text-zinc-500 leading-relaxed">Your client and provider conversations will appear here. Chat access will be available only for confirmed booking relationships.</p>
    </div>
  </section>
);
