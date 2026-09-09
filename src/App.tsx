import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import Game from './components/Game.tsx';
import GameIntro from './components/GameIntro.tsx';

export default function Home() {
  const [introOpen, setIntroOpen] = useState(true);
  const enter = async () => {
    setIntroOpen(false);
  };
  return (
    <main className="h-screen w-screen overflow-hidden bg-brown-900 font-body">
      <Game />
      {introOpen && <GameIntro onEnter={enter} />}
      <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
    </main>
  );
}
