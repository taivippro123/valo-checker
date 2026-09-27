import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Check, Copy, Download, Eye, EyeOff, Loader2, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

const toPngBlob = (blob) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((png) => png ? resolve(png) : reject(new Error('toBlob failed')), 'image/png');
  };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
  image.src = url;
});

const OwnedWeaponsShare = ({ API_URL, profile, riotId, shard, language = 'vn', t }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState('');
  const blobRef = useRef(null);
  const previewRef = useRef('');
  const vn = language !== 'en';
  const ownedWeapons = profile?.ownedWeapons || [];

  const releasePreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
  }, []);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/share/owned-weapons/image`, {
        ownedWeapons,
        premiumOnly,
        shard,
        riotId,
        lang: vn ? 'vn' : 'en'
      }, { responseType: 'blob' });
      releasePreview();
      blobRef.current = res.data;
      const url = URL.createObjectURL(res.data);
      previewRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      toast.error(error.response?.status === 429
        ? (vn ? 'Bạn tạo ảnh quá nhanh, thử lại sau.' : 'Too many requests, try again shortly.')
        : (vn ? 'Không tạo được ảnh kho vũ khí.' : 'Could not generate the inventory image.'));
    } finally {
      setLoading(false);
    }
  }, [API_URL, ownedWeapons, premiumOnly, releasePreview, riotId, shard, vn]);

  useEffect(() => {
    if (open) loadPreview();
  }, [open, premiumOnly, loadPreview]);

  useEffect(() => () => releasePreview(), [releasePreview]);

  const close = () => {
    setOpen(false);
    releasePreview();
    setPreviewUrl('');
    blobRef.current = null;
  };

  const download = () => {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `valocheck-owned-weapons-${new Date().toISOString().slice(0, 10)}.jpg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    if (!blobRef.current) return;
    setBusy('copy');
    try {
      const png = await toPngBlob(blobRef.current);
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': png })]);
      toast.success(vn ? 'Đã copy ảnh kho vũ khí' : 'Inventory image copied');
    } catch {
      toast.error(vn ? 'Không thể copy ảnh, hãy tải ảnh.' : 'Clipboard blocked, download the image instead.');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-valorant-gold transition-colors hover:border-valorant-red/40 hover:text-white">
        <Share2 className="h-3.5 w-3.5" /> {t.ownedWeaponsShare}
      </button>
      {open && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4" role="dialog" aria-modal="true" onClick={close}>
          <div className="glass-panel relative flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:max-h-[calc(100dvh-2rem)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-red">{t.ownedWeaponsShareTitle}</h3>
              <button type="button" onClick={close} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-white/5 bg-black/30 p-2">
                {loading ? <Loader2 className="h-7 w-7 animate-spin text-valorant-red" /> : previewUrl ? <img src={previewUrl} alt={t.ownedWeaponsShareTitle} className="max-h-[62vh] w-auto max-w-full rounded-lg object-contain" /> : null}
              </div>
              <button type="button" onClick={() => setPremiumOnly((value) => !value)} className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:border-valorant-red/30">
                <span className="flex items-center gap-2 text-xs text-white">{premiumOnly ? <Eye className="h-4 w-4 text-valorant-gold" /> : <EyeOff className="h-4 w-4 text-valorant-gray" />}{t.ownedWeaponsPremiumOnly}</span>
                <span className={`relative h-5 w-9 rounded-full ${premiumOnly ? 'bg-valorant-red' : 'bg-white/15'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${premiumOnly ? 'left-[1.15rem]' : 'left-0.5'}`} /></span>
              </button>
              <p className="mt-1.5 px-1 text-[10px] text-valorant-gray">{t.ownedWeaponsPremiumHint}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={!previewUrl} onClick={download} className="inline-flex items-center justify-center gap-2 rounded-lg bg-valorant-red px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Download className="h-4 w-4" />{t.shareDownload}</button>
                <button type="button" disabled={!previewUrl || busy === 'copy'} onClick={copy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy === 'copy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}{t.shareCopy}</button>
              </div>
            </div>
          </div>
        </div>, document.body) : null}
    </>
  );
};

export default OwnedWeaponsShare;