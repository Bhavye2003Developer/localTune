'use client';

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import { usePlayer } from '../../lib/playerContext';

// Recursively extract files from a FileSystemEntry (handles folders)
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

  const handleFiles = useCallback(
    (files: File[]) => loadFiles(files),
    [loadFiles]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const items = Array.from(e.dataTransfer.items);
    const entries = items
      .map(i => i.webkitGetAsEntry())
      .filter((en): en is FileSystemEntry => en !== null);
    const nested = await Promise.all(entries.map(extractFiles));
    const all = nested.flat().filter(
      f => f.type.startsWith('audio/') || f.type.startsWith('video/')
    );
    if (all.length > 0) handleFiles(all);
  }, [handleFiles]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(Array.from(e.target.files));
    },
    [handleFiles]
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`mx-3 my-3 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 py-6 px-4
        ${dragging
          ? 'border-cyan-400/70 bg-cyan-400/8'
          : 'border-white/15 hover:border-white/30 hover:bg-white/4'
        }`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        className="hidden"
        onChange={onInputChange}
      />
      {dragging ? (
        <FolderOpen size={22} className="text-cyan-400" />
      ) : (
        <Upload size={22} className="text-white/40" />
      )}
      <p className="text-white/50 text-xs text-center leading-relaxed">
        {dragging ? 'Drop to load' : 'Click or drag files / folders'}
      </p>
    </div>
  );
}
