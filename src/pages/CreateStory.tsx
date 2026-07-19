import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Type, Image as ImageIcon } from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';

const BACKGROUNDS = [
  'linear-gradient(135deg,#1f66f5,#ff4281)',
  'linear-gradient(135deg,#06cf7e,#3385ff)',
  'linear-gradient(135deg,#ff4281,#f59e0b)',
  'linear-gradient(135deg,#1a1e36,#3385ff)',
  'linear-gradient(135deg,#06cf7e,#f59e0b)',
  'linear-gradient(135deg,#92400e,#ff4281)',
];

export default function CreateStory() {
  const { session } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState<'choose' | 'text' | 'media'>('choose');
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function post() {
    if (!session) return;
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      let type = 'image';
      if (mediaFile) {
        mediaUrl = await uploadFile(mediaType === 'video' ? 'reels' : 'stories', mediaFile);
        type = mediaType;
      } else if (mode === 'text') {
        if (!text.trim()) {
          toast('Add some text', 'error');
          setPosting(false);
          return;
        }
        type = 'text';
      }
      const { error } = await supabase.from('stories').insert({
        user_id: session.user.id,
        media_url: mediaUrl,
        media_type: type,
        text: mode === 'text' ? text.trim() : null,
        background: mode === 'text' ? bg : null,
      });
      if (error) throw error;
      toast('Story shared', 'success');
      nav('/');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setPosting(false);
    }
  }

  function pickFile(accept: string, type: 'image' | 'video') {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.onchange = () => {
      const f = fileRef.current?.files?.[0];
      if (f) {
        setMediaFile(f);
        setMediaType(type);
        setMediaPreview(URL.createObjectURL(f));
        setMode('media');
      }
    };
    fileRef.current.click();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <input ref={fileRef} type="file" className="hidden" />
      <div className="flex items-center gap-3 px-3 py-3">
        <button onClick={() => (mode === 'choose' ? nav('/') : setMode('choose'))} className="p-2 rounded-full hover:bg-white/10 text-white">
          <ChevronLeft size={24} />
        </button>
        <span className="text-white font-medium">New story</span>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-4 p-6 max-w-md w-full">
            <button onClick={() => setMode('text')} className="glass rounded-3xl p-8 flex flex-col items-center gap-3 text-white hover:scale-105 transition-transform">
              <Type size={32} />
              <span className="font-medium">Text</span>
            </button>
            <button onClick={() => pickFile('image/*', 'image')} className="glass rounded-3xl p-8 flex flex-col items-center gap-3 text-white hover:scale-105 transition-transform">
              <ImageIcon size={32} />
              <span className="font-medium">Photo</span>
            </button>
            <button onClick={() => pickFile('video/*', 'video')} className="glass rounded-3xl p-8 flex flex-col items-center gap-3 text-white hover:scale-105 transition-transform col-span-2">
              <Camera size={32} />
              <span className="font-medium">Video</span>
            </button>
          </div>
        )}

        {mode === 'text' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6" style={{ background: bg }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something..."
              className="bg-transparent text-white text-3xl font-display font-semibold text-center w-full max-w-md resize-none focus:outline-none placeholder:text-white/40"
              rows={4}
              autoFocus
            />
            <div className="mt-6 flex gap-2 flex-wrap justify-center">
              {BACKGROUNDS.map((b) => (
                <button key={b} onClick={() => setBg(b)} className={`w-9 h-9 rounded-full ring-2 ${bg === b ? 'ring-white' : 'ring-transparent'}`} style={{ background: b }} />
              ))}
            </div>
          </div>
        )}

        {mode === 'media' && mediaPreview && (
          <>
            {mediaType === 'video' ? (
              <video src={mediaPreview} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={mediaPreview} className="w-full h-full object-cover" />
            )}
          </>
        )}
      </div>

      {mode !== 'choose' && (
        <div className="px-4 pb-6 pt-3 flex justify-center">
          <Button onClick={post} loading={posting} size="lg">Share story</Button>
        </div>
      )}
    </div>
  );
}
