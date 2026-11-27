import { useId, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function ProfileAvatar({ name, url }: { name: string; url: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <span aria-hidden="true" className="flex size-full items-center justify-center overflow-hidden rounded-full bg-[#083181] text-sm font-semibold text-white">
    {url && url !== failedUrl
      ? <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} className="size-full object-cover" />
      : initials}
  </span>;
}

async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) {
    throw new Error('Selecione uma imagem JPG, PNG ou WebP de até 10 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const size = Math.min(bitmap.width, bitmap.height, 320);
    const sourceSize = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.drawImage(bitmap, (bitmap.width - sourceSize) / 2, (bitmap.height - sourceSize) / 2,
      sourceSize, sourceSize, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')),
      'image/jpeg', 0.85,
    ));
  } finally {
    bitmap.close();
  }
}

export function ProfilePhotoModal({ name, url, onChange, onClose }: {
  name: string; url: string;
  onChange: (url: string) => void; onClose: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const fileHint = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const save = async (file?: File) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (file) {
        const result = await apiClient.uploadProfilePhoto(await preparePhoto(file));
        onChange(result.avatar_url);
      } else {
        await apiClient.removeProfilePhoto();
        onChange('');
      }
      setNotice(file ? 'Foto salva.' : 'Foto removida.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível atualizar a foto.');
    } finally {
      setBusy(false);
    }
  };

  return <Modal isOpen title="Foto de perfil" maxWidth="sm" onClose={() => { if (!busy) onClose(); }}>
    <div className="space-y-5 text-sm">
      <div className="flex flex-col items-center gap-3 pb-1 text-center">
        <div className="size-20 rounded-full ring-4 ring-slate-100 dark:ring-slate-800">
          <ProfileAvatar name={name} url={url} />
        </div>
        <p className="w-full break-words text-base font-semibold text-slate-900 dark:text-slate-100">{name}</p>
      </div>
      <div className="flex flex-col items-center gap-2.5 border-t border-slate-200 pt-5 dark:border-slate-700">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} hidden
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void save(file);
          }}
        />
        <Button type="button" className="min-h-11 w-full" icon={<ImagePlus aria-hidden="true" className="size-4" />}
          aria-describedby={fileHint} disabled={busy} onClick={() => fileInput.current?.click()}>
          {url ? 'Trocar foto' : 'Enviar foto'}
        </Button>
        <p id={fileHint} className="text-center text-xs text-slate-600 dark:text-slate-300">JPG, PNG ou WebP de até 10 MB.</p>
        {url && <Button type="button" variant="ghost" className="min-h-11" disabled={busy}
          icon={<Trash2 aria-hidden="true" className="size-4" />} onClick={() => void save()}>
          Remover foto
        </Button>}
      </div>
      {(busy || notice) && <p role="status" className="text-center text-xs text-slate-600 dark:text-slate-300">{busy ? 'Salvando…' : notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-red-700 dark:bg-rose-950/40 dark:text-red-300">{error}</p>}
    </div>
  </Modal>;
}
