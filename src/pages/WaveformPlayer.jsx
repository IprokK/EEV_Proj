import React, { useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';

const WaveformPlayer = ({ url, playing }) => {
    const waveformRef = useRef(null);
    const wavesurfer = useRef(null);

    useEffect(() => {
        wavesurfer.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#999',
            progressColor: '#0f0',
            height: 80,
            barWidth: 2,
            scrollParent: true,
            responsive: true,
            minPxPerSec: 120, // волна станет длиннее
        });

        wavesurfer.current.load(url)
            .catch(error => {
                console.error('Ошибка загрузки аудио:', error);
            });

        return () => {
            wavesurfer.current.destroy();
        };
    }, [url]);

    useEffect(() => {
        if (!wavesurfer.current) return;
        if (playing) {
            wavesurfer.current.play();
        } else {
            wavesurfer.current.pause();
        }
    }, [playing]);

    return (
        <div
            ref={waveformRef}
            style={{
                width: '100%',
                height: '100%',
                overflowX: 'auto',
                overflowY: 'hidden'
            }}
        />
    );
};

export default WaveformPlayer;
