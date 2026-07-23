import { ToastContainer } from 'react-toastify';
import Game from './components/Game.tsx';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-brown-900 font-body">
      <Game />
      <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
    </main>
  );
}
