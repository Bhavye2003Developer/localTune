'use client';

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { usePlayer } from '../../lib/playerContext';

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
      className="mx-3 my-2 cursor-pointer flex flex-col items-center justify-center gap-1 py-4 px-4 transition-all rounded-lg"
      style={{
        border: dragging ? '1px dashed #f59e0b' : '1px dashed var(--br)',
        background: dragging ? '#f59e0b08' : 'var(--s2)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        className="hidden"
        onChange={onInputChange}
      />
      <span
        className="text-[11px] font-semibold"
        style={{ color: dragging ? 'var(--a)' : 'var(--t2)', fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700 }}
      >
        {dragging ? 'Drop to add' : 'Add files'}
      </span>
      <span
        className="text-[9.5px]"
        style={{ color: 'var(--t3)', fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 500 }}
      >
        {dragging ? '' : 'drag & drop or click'}
      </span>
    </div>
  );
}
