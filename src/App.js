// src/App.js
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login            from './pages/Login';
import RegisterStep1    from './pages/RegisterStep1';
import RegisterStep2    from './pages/RegisterStep2';
import RegisterStep3    from './pages/RegisterStep3';
import GameWrapper      from './components/GameWrapper';
import RequireProfile   from './components/RequireProfile';
import MapEditor        from './pages/MapEditor';
import InteriorEditor   from './pages/InteriorEditor';
import CollisionEditor  from './pages/CollisionEditor';
import EnhancedCollisionEditor from './pages/EnhancedCollisionEditor';

export default function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('token'));

  return (
    <Routes>
      {/* корень */}
      <Route
        path="/"
        element={
          isAuth
            ? <Navigate to="/game" replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* логин */}
      <Route
        path="/login"
        element={
          isAuth
            ? <Navigate to="/game" replace/>
            : <Login onLogin={() => setIsAuth(true)} />
        }
      />

      {/* регистрация всегда с нуля */}
      <Route path="/register/step1" element={<RegisterStep1 />} />
      <Route path="/register/step2" element={<RegisterStep2 />} />
      <Route path="/register/step3" element={<RegisterStep3 />} />

      {/* игра: оборачиваем в RequireProfile */}
      <Route
        path="/game"
        element={
          isAuth
            ? <RequireProfile>
                <GameWrapper />
              </RequireProfile>
            : <Navigate to="/login" replace/>
        }
      />

      {/* редактор карты */}
      <Route
        path="/editor"
        element={
          isAuth
            ? <RequireProfile>
                <MapEditor />
              </RequireProfile>
            : <Navigate to="/login" replace/>
        }
      />

      {/* редактор интерьеров */}
      <Route
        path="/interior-editor"
        element={
          isAuth
            ? <RequireProfile>
                <InteriorEditor />
              </RequireProfile>
            : <Navigate to="/login" replace/>
        }
      />

      {/* редактор коллизий */}
      <Route
        path="/collision-editor"
        element={
          isAuth
            ? <RequireProfile>
                <CollisionEditor />
              </RequireProfile>
            : <Navigate to="/login" replace/>
        }
      />
      <Route
        path="/enhanced-collision-editor"
        element={
          isAuth
            ? <RequireProfile>
                <EnhancedCollisionEditor />
              </RequireProfile>
            : <Navigate to="/login" replace/>
        }
      />

      {/* всё остальное */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
