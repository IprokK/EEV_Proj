import React, { useEffect, useRef } from 'react';

function AvatarCreator({ onAvatarExport }) {
  const frameRef = useRef();

  useEffect(() => {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://readyplayer.me/avatar?frameApi';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';

    frameRef.current.appendChild(iframe);

    const subscribe = (event) => {
      if (event.data?.source !== 'readyplayerme') return;

      // готово к работе
      if (event.data.eventName === 'v1.frame.ready') {
        iframe.contentWindow.postMessage(
          {
            target: 'readyplayerme',
            type: 'subscribe',
            eventName: 'v1.avatar.exported',
          },
          '*'
        );
      }

      // аватар создан
      if (event.data.eventName === 'v1.avatar.exported') {
        const avatarUrl = event.data.data.url;
        onAvatarExport(avatarUrl); // переход в игру
      }
    };

    window.addEventListener('message', subscribe);
    return () => window.removeEventListener('message', subscribe);
  }, [onAvatarExport]);

  return <div ref={frameRef}></div>;
}

export default AvatarCreator;
