import { PlayerLoader } from './components/player/PlayerLoader';

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-black">
      <PlayerLoader />
    </main>
  );
}
