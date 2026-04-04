declare module 'jsmediatags' {
  interface Picture {
    format: string;
    data: number[];
  }

  interface Tags {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    track?: string;
    genre?: string;
    picture?: Picture;
  }

  interface TagResult {
    type: string;
    tags: Tags;
  }

  interface ReadOptions {
    onSuccess: (tag: TagResult) => void;
    onError: (error: { type: string; info: string }) => void;
  }

  function read(file: File | string, opts: ReadOptions): void;

  export = { read };
}
