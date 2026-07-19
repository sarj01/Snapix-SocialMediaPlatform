import { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Send, Search as SearchIcon, Image as ImageIcon, Plus, Phone, Video, MessageSquare } from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { Button, EmptyState, Spinner, Input } from '../components/ui';
import type { Conversation, Message, Profile } from '../lib/types';
import { timeAgo } from '../lib/utils';

interface ChatPreview extends Conversation {
  other?: Profile | null;
  last?: Message | null;
  unread?: number;
}

export default function Messages() {
  return (
    <Routes>
      <Route index element={<ChatList />} />
      <Route path=":id" element={<ChatRoom />} />
      <Route path="new" element={<NewChat />} />
    </Routes>
  );
}

function ChatList() {
  const { session } = useAuth();
  const nav = useNavigate();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    const { data: convs } = await supabase
      .from('conversations')
      .select('*, conversation_members!inner(user_id)')
      .eq('conversation_members.user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!convs) { setLoading(false); return; }

    const enriched: ChatPreview[] = [];
    for (const c of convs as Conversation[]) {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .neq('user_id', session.user.id)
        .eq('conversation_id', c.id);
      const otherId = members?.[0]?.user_id;
      let other: Profile | null = null;
      if (otherId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle();
        other = data as Profile | null;
      }
      const { data: last } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      enriched.push({ ...c, other, last: last as Message | null });
    }
    setChats(enriched);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = chats.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.other?.username.toLowerCase().includes(q) || c.other?.full_name?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Messages</h1>
        <button onClick={() => nav('/messages/new')} className="p-2.5 rounded-full glass text-ink-700 dark:text-ink-200 hover:scale-110 transition-transform">
          <Plus size={20} />
        </button>
      </div>

      <div className="relative mb-4">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats"
          className="w-full glass rounded-2xl pl-11 pr-4 py-3 text-ink-900 dark:text-white placeholder:text-ink-400 focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="No conversations yet"
          description="Start a chat with someone you follow."
          action={<Button onClick={() => nav('/messages/new')}>New message</Button>}
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => nav(`/messages/${c.id}`)}
              className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/15 transition-colors text-left"
            >
              <Avatar src={c.other?.avatar_url} username={c.other?.username} size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900 dark:text-white truncate">{c.other?.username || 'Group'}</div>
                <div className="text-sm text-ink-500 truncate">
                  {c.last ? (c.last.text || (c.last.media_type === 'image' ? '📷 Photo' : c.last.media_type === 'video' ? '🎥 Video' : 'Message')) : 'Say hi!'}
                </div>
              </div>
              {c.last && <span className="text-[11px] text-ink-400">{timeAgo(c.last.created_at)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewChat() {
  const { session } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [people, setPeople] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('follows')
      .select('following:profiles!follows_following_id_profiles_fkey(*)')
      .eq('follower_id', session.user.id)
      .then(({ data }) => {
        const list = (data || []).map((d: any) => d.following as Profile).filter(Boolean);
        setPeople(list);
        setLoading(false);
      });
  }, [session]);

  const filtered = people.filter((p) =>
    !search.trim() ? true : p.username.toLowerCase().includes(search.toLowerCase()) || (p.full_name || '').toLowerCase().includes(search.toLowerCase()),
  );

  async function startChat(p: Profile) {
    if (!session) return;
    const { data: existing } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', session.user.id)
      .in('conversation_id', (
        await supabase.from('conversation_members').select('conversation_id').eq('user_id', p.id)
      ).data?.map((m) => m.conversation_id) || []);
    if (existing && existing.length > 0) {
      nav(`/messages/${existing[0].conversation_id}`);
      return;
    }
    const { data: conv, error } = await supabase.from('conversations').insert({ is_group: false }).select().single();
    if (error || !conv) return toast(error?.message || 'Failed', 'error');
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: session.user.id },
      { conversation_id: conv.id, user_id: p.id },
    ]);
    nav(`/messages/${conv.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => nav('/messages')} className="p-2 rounded-full glass text-ink-700 dark:text-ink-200">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white">New message</h1>
      </div>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people you follow" className="mb-4" />
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon={<MessageSquare size={32} />} title="No one to message yet" description="Follow people to start chatting." />
      ) : (
        <div className="space-y-1">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => startChat(p)} className="w-full glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/15 text-left">
              <Avatar src={p.avatar_url} username={p.username} size={44} />
              <div>
                <div className="font-medium text-ink-900 dark:text-white">{p.username}</div>
                <div className="text-xs text-ink-500">{p.full_name || ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatRoom() {
  const { id } = useParams();
  const { session } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id || !session) return;
    (async () => {
      const { data: members } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', id).neq('user_id', session.user.id);
      if (members?.[0]) {
        const { data } = await supabase.from('profiles').select('*').eq('id', members[0].user_id).maybeSingle();
        setOther(data as Profile | null);
      }
      const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
      setMessages((msgs as Message[]) || []);
      setLoading(false);
      // mark received messages as read
      if (msgs) {
        for (const m of msgs as Message[]) {
          if (m.sender_id !== session.user.id) {
            await supabase.from('message_reads').upsert({ message_id: m.id, user_id: session.user.id }, { onConflict: 'message_id,user_id' });
          }
        }
      }
    })();
  }, [id, session]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`chat-${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
      setMessages((m) => [...m, payload.new as Message]);
      if ((payload.new as Message).sender_id !== session?.user.id) {
        supabase.from('message_reads').upsert({ message_id: (payload.new as Message).id, user_id: session!.user.id }, { onConflict: 'message_id,user_id' }).then();
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, session]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!session || !id || !text.trim()) return;
    const { data, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: session.user.id, text: text.trim() }).select().single();
    if (error) return toast(error.message, 'error');
    setMessages((m) => [...m, data as Message]);
    setText('');
    if (other) {
      await supabase.from('notifications').insert({ user_id: other.id, actor_id: session.user.id, type: 'message', entity_id: id, entity_type: 'conversation' });
    }
  }

  async function sendImage(file: File) {
    if (!session || !id) return;
    try {
      const url = await uploadFile('messages', file);
      const { data } = await supabase.from('messages').insert({ conversation_id: id, sender_id: session.user.id, media_url: url, media_type: file.type.startsWith('video') ? 'video' : 'image' }).select().single();
      if (data) setMessages((m) => [...m, data as Message]);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950 dark:bg-ink-950 light:bg-white">
      <header className="flex items-center gap-3 px-3 py-3 border-b border-white/5 backdrop-blur-xl">
        <button onClick={() => nav('/messages')} className="p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200">
          <ChevronLeft size={22} />
        </button>
        <Avatar src={other?.avatar_url} username={other?.username} size={36} to={`/u/${other?.username}`} />
        <div className="flex-1 min-w-0">
          <Link to={`/u/${other?.username}`} className="font-medium text-ink-900 dark:text-white block truncate">{other?.username}</Link>
          <span className="text-xs text-mint-400">Active now</span>
        </div>
        <button className="p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200"><Phone size={18} /></button>
        <button className="p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200"><Video size={18} /></button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? <div className="flex justify-center py-10"><Spinner /></div> : (
          messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Avatar src={other?.avatar_url} username={other?.username} size={80} />
              <p className="mt-3 font-medium text-ink-900 dark:text-white">{other?.username}</p>
              <p className="text-sm text-ink-500">This is the start of your conversation.</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === session?.user.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white' : 'glass text-ink-900 dark:text-white'}`}>
                    {m.media_url && (m.media_type === 'video' ? (
                      <video src={m.media_url} controls className="rounded-xl max-w-[220px]" />
                    ) : (
                      <img src={m.media_url} className="rounded-xl max-w-[220px]" />
                    ))}
                    {m.text && <p className="text-sm leading-snug">{m.text}</p>}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      <div className="px-3 py-3 border-t border-white/5 flex items-center gap-2 pb-safe">
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); }} />
        <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-full glass text-ink-700 dark:text-ink-200">
          <ImageIcon size={20} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message..."
          className="flex-1 glass rounded-full px-4 py-3 text-ink-900 dark:text-white placeholder:text-ink-400 focus:ring-2 focus:ring-brand-400"
        />
        <button onClick={send} disabled={!text.trim()} className="p-2.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 text-white disabled:opacity-40">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
