'use client';

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { usePlayer } from '../../lib/playerContext';
import { TacticalBrackets } from '../ui/TacticalBrackets';

async function extractFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise(resolve => (entry as FileSystemFileEntry).file(f => resolve([f])));
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>(resolve =>
      reader.readEntries(e => resolve(e as FileSystemEntry[]))
    );
    const nested = await Promise.all(entries.map(extractFiles));
    return nested.flat();
  }
  return [];
}

export function FileDropZone() {
  const { loadFiles } = usePlayer();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((files: File[]) => loadFiles(files), [loadFiles]);

  const onDragOver  = useCallback((e: DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const items = Array.from(e.dataTransfer.items);
    const entries = items.map(i => i.webkitGetAsEntry()).filter((en): en is FileSystemEntry => en !== null);
    const nested = await Promise.all(entries.map(extractFiles));
    const all = nested.flat().filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'));
    if (all.length > 0) handleFiles(all);
  }, [handleFiles]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  }, [handleFiles]);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className="relative mx-3 my-2 cursor-pointer flex flex-col items-center justify-center gap-1.5 py-5 px-4 transition-all"
      style={{
        boxShadow: dragging ? '0 0 16px rgba(255,0,60,0.15)' : undefined,
      }}
    >
      <TacticalBrackets
        color={dragging ? 'rgba(255,0,60,0.7)' : 'rgba(0,212,255,0.35)'}
        size={12}
        thickness={1.5}
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        className="hidden"
        onChange={onInputChange}
      />

      <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: dragging ? 'var(--nx-red)' : 'var(--nx-cyan-dim)' }}>
        {dragging ? 'RECEIVING PAYLOAD' : 'DROP AUDIO FILES'}
      </span>
      <span className="font-mono text-[9px]" style={{ color: 'var(--nx-text-dim)' }}>
        {dragging ? '—' : 'OR CLICK TO SELECT'}
      </span>
    </div>
  );
}
