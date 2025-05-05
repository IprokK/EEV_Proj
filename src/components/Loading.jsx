// src/components/Loading.jsx
import React, { useEffect, useState } from 'react';

export default function Loading() {
  const [showFirst, setShowFirst] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setShowFirst(f => !f), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      backgroundColor: '#474747',
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      margin: 0
    }}>
      <div style={{
        position: 'relative',
        width: '80%',
        height: '80%',
        overflow: 'hidden'
      }}>
        <img
          src="/images/photo_2025-02-22_19-35-03.jpg"
          alt=""
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            transition: 'opacity 2s ease',
            opacity: showFirst ? 1 : 0
          }}
        />
        <img
          src="/images/photo_2025-02-22_19-39-34.jpg"
          alt=""
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            transition: 'opacity 2s ease',
            opacity: showFirst ? 0 : 1
          }}
        />
      </div>
      <img
        src="/images/222.gif"
        alt=""
        style={{
          height: '30%',
          width: '30%',
          objectFit: 'contain',
          marginTop: 20
        }}
      />
    </div>
  );
}
