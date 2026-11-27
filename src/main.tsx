import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './style.css';

createRoot(document.getElementById('root')!).render(<App />);

const fonts = document.querySelector<HTMLLinkElement>('#hub-fonts');
if (fonts) {
  if (fonts.sheet) fonts.media = 'all';
  else fonts.addEventListener('load', () => { fonts.media = 'all'; }, { once: true });
}
