import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import Game from './components/Game.tsx';
import GameIntro from './components/GameIntro.tsx';

const INTRO_KEY = 'ai-battle-intro-seen-v2';

export default function Home() {
  const [introOpen, setIntroOpen] = useState(() => localStorage.getItem(INTRO_KEY) !== '1');
  const enter = () => {
    localStorage.setItem(INTRO_KEY, '1');
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
