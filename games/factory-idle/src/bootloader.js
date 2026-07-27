import { scriptUrls } from './generated/module-manifest.js';
import { lobbyUrl } from './runtime/platform-presence.js';
import './styles/main.css';
import './styles/reset.css';

const loadingMessage = document.getElementById('loadingMessage');
const backToLobby = document.getElementById('backToLobby');

if (backToLobby) backToLobby.href = lobbyUrl;

function loadClassicScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error(`脚本加载失败：${url}`)),
      { once: true },
    );
    document.head.append(script);
  });
}

try {
  for (const scriptUrl of scriptUrls) {
    await loadClassicScript(scriptUrl);
  }
} catch (error) {
  console.error(error);
  if (loadingMessage) {
    loadingMessage.textContent = '游戏资源加载失败，请刷新页面重试。';
  }
}
