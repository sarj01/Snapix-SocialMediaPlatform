import { useRef, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, Film, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Button, Input, Textarea } from '../components/ui';

const FILTERS = [
  { name: 'Original', css: 'none' },
  { name: 'Aurora', css: 'saturate(1.4) hue-rotate(15deg)' },
  { name: 'Noir', css: 'grayscale(1) contrast(1.1)' },
  { name: 'Sunset', css: 'sepia(0.4) saturate(1.5) hue-rotate(-15deg)' },
  { name: 'Frost', css: 'brightness(1.1) saturate(0.7) hue-rotate(180deg)' },
  { name: 'Vivid', css: 'saturate(1.8) contrast(1.1)' },
];

export default function Create() {
  return (
    <Routes>
      <Route index element={<CreatePost />} />
      <Route path="reel" element={<CreateReel />} />
    </Routes>
  );
}

function CreatePost() {
  const { session } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState(0);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pick() {
    fileRef.current?.click();
  }

  function onFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 10);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
    setIndex(0);
  }

  async function post() {
    if (!session || files.length === 0) return;
    setPosting(true);
    try {
      const { data: postRow, error: pe } = await supabase.from('posts').insert({ user_id: session.user.id, caption: caption.trim() || null, location: location.trim() || null }).select().single();
      if (pe) throw pe;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const isVideo = f.type.startsWith('video');
        const url = await uploadFile(isVideo ? 'reels' : 'posts', f);
        await supabase.from('post_media').insert({ post_id: postRow.id, media_url: url, media_type: isVideo ? 'video' : 'image', position: i });
      }
      toast('Posted!', 'success');
      nav('/');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setPosting(false);
    }
  }

  async function saveDraft() {
    if (!session || files.length === 0) return;
    const media = files.map((f) => ({ url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'video' : 'image' }));
    await supabase.from('drafts').insert({ user_id: session.user.id, caption: caption.trim(), media });
    toast('Draft saved', 'success');
    nav('/');
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-950 dark:bg-ink-950 light:bg-white flex flex-col">
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <header className="flex items-center justify-between px-3 py-3 border-b border-white/5">
        <button onClick={() => nav(-1)} className="p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display font-semibold text-ink-900 dark:text-white">New post</h1>
        {files.length > 0 ? (
          <button onClick={post} disabled={posting} className="px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 text-white text-sm font-medium disabled:opacity-50">
            {posting ? 'Sharing...' : 'Share'}
          </button>
        ) : (
          <span className="w-8" />
        )}
      </header>

      {files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="glass rounded-4xl p-10 mb-5">
            <ImageIcon size={48} className="text-ink-400" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white mb-1">Create a new post</h2>
          <p className="text-sm text-ink-500 mb-6">Upload photos or videos to share with your followers.</p>
          <Button size="lg" onClick={pick}>Select from device</Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="relative aspect-square bg-black/30">
            {files[index]?.type.startsWith('video') ? (
              <video src={previews[index]} controls className="w-full h-full object-cover" style={{ filter: FILTERS[filter].css === 'none' ? undefined : FILTERS[filter].css }} />
            ) : (
              <img src={previews[index]} className="w-full h-full object-cover" style={{ filter: FILTERS[filter].css === 'none' ? undefined : FILTERS[filter].css }} />
            )}
            {files.length > 1 && (
              <>
                {index > 0 && <button onClick={() => setIndex((i) => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white"><ArrowLeft size={18} /></button>}
                {index < files.length - 1 && <button onClick={() => setIndex((i) => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white"><ArrowRight size={18} /></button>}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs">{index + 1}/{files.length}</div>
              </>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-3">
            {FILTERS.map((f, i) => (
              <button key={f.name} onClick={() => setFilter(i)} className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-full overflow-hidden ring-2 ${filter === i ? 'ring-brand-400' : 'ring-transparent'}`}>
                  <img src={previews[0]} className="w-full h-full object-cover" style={{ filter: f.css === 'none' ? undefined : f.css }} />
                </div>
                <span className="text-[10px] text-ink-500">{f.name}</span>
              </button>
            ))}
          </div>

          <div className="px-4 pb-6 space-y-3">
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Write a caption... #hashtag @mention" />
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={saveDraft}>Save draft</Button>
              <Button variant="ghost" onClick={() => { setFiles([]); setPreviews([]); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateReel() {
  const { session } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [audio, setAudio] = useState('');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function post() {
    if (!session || !file) return;
    setPosting(true);
    try {
      const url = await uploadFile('reels', file);
      const { error } = await supabase.from('reels').insert({ user_id: session.user.id, video_url: url, caption: caption.trim() || null, audio_name: audio.trim() || null });
      if (error) throw error;
      toast('Reel shared!', 'success');
      nav('/reels');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-950 dark:bg-ink-950 light:bg-white flex flex-col">
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
      <header className="flex items-center justify-between px-3 py-3 border-b border-white/5">
        <button onClick={() => nav(-1)} className="p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200"><ChevronLeft size={24} /></button>
        <h1 className="font-display font-semibold text-ink-900 dark:text-white">New reel</h1>
        {file ? (
          <button onClick={post} disabled={posting} className="px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 text-white text-sm font-medium disabled:opacity-50">{posting ? 'Sharing...' : 'Share'}</button>
        ) : <span className="w-8" />}
      </header>

      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="glass rounded-4xl p-10 mb-5"><Film size={48} className="text-ink-400" /></div>
          <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white mb-1">Create a reel</h2>
          <p className="text-sm text-ink-500 mb-6">Upload a vertical video to share as a reel.</p>
          <Button size="lg" onClick={() => fileRef.current?.click()}>Select video</Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="relative aspect-[9/16] max-h-[60vh] mx-auto bg-black/30">
            <video src={preview!} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="px-4 py-4 space-y-3">
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="Caption..." />
            <Input value={audio} onChange={(e) => setAudio(e.target.value)} placeholder="Audio name (optional)" />
            <Button variant="ghost" onClick={() => { setFile(null); setPreview(null); }}>Change video</Button>
          </div>
        </div>
      )}
    </div>
  );
}
