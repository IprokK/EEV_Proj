// src/components/Loading.jsx
import React, { useEffect, useState } from 'react';

export default function Loading() {
    const [showFirst, setShowFirst] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const toggleId = setInterval(() => setShowFirst(f => !f), 5000);

        // —имул€ци€ прогресса загрузки
        const progressId = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressId);
                    return 100;
                }
                return prev + Math.random() * 40;
            });
        }, 500);

        return () => {
            clearInterval(toggleId);
            clearInterval(progressId);
        };
    }, []);

    return (
        <div style={{
            backgroundColor: '#1a1a1a',
            backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 0,
            overflow: 'hidden',
            position: 'relative'
        }}>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 20% 50%, rgba(71, 71, 71, 0.4) 0%, transparent 50%)',
                zIndex: 1
            }}></div>

            <div style={{
                position: 'relative',
                zIndex: 2,
                width: '80%',
                maxWidth: '600px',
                height: '60%',
                overflow: 'hidden',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
            }}>
                <img
                    src="/images/photo_2025-02-22_19-35-03.jpg"
                    alt=""
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        transition: 'opacity 1.5s ease-in-out',
                        opacity: showFirst ? 1 : 0,
                        borderRadius: '12px'
                    }}
                />
                <img
                    src="/images/photo_2025-02-22_19-39-34.jpg"
                    alt=""
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        transition: 'opacity 1.5s ease-in-out',
                        opacity: showFirst ? 0 : 1,
                        borderRadius: '12px'
                    }}
                />
            </div>

            <div style={{
                position: 'relative',
                zIndex: 2,
                width: '30%',
                maxWidth: '200px',
                marginTop: '30px'
            }}>
                <img
                    src="/images/222.gif"
                    alt="Loading animation"
                    style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))'
                    }}
                />
            </div>

            <div style={{
                width: '40%',
                maxWidth: '300px',
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '3px',
                marginTop: '20px',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 2
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#fff',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease-out',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                }}></div>
            </div>

            <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                marginTop: '15px',
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '1px',
                position: 'relative',
                zIndex: 2
            }}>
                Loading {Math.min(100, Math.round(progress))}%
            </p>

            {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    width: '4px',
                    height: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '50%',
                    top: `${20 + (i * 15)}%`,
                    left: `${10 + (i * 5)}%`,
                    animation: `float ${6 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 0.5}s`,
                    zIndex: 0
                }}></div>
            ))}

            <style>
                {`
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.5; }
            25% { transform: translateY(-20px) translateX(10px); }
            50% { transform: translateY(0) translateX(20px); opacity: 0.7; }
            75% { transform: translateY(20px) translateX(10px); }
          }
        `}
            </style>
        </div>
    );
}