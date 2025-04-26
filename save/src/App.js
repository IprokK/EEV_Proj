import React, { useState } from 'react';
import CharacterSelect from './CharacterSelect';
import Game from './Game';

function App() {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [gender, setGender] = useState(null);      // новый стейт

  return (
    <>
      {!avatarUrl ? (
        <CharacterSelect
          onSelect={(url, g) => {                  // теперь onSelect передаёт два аргумента
            setAvatarUrl(url);
            setGender(g);
          }}
        />
      ) : (
        <Game avatarUrl={avatarUrl} gender={gender} />
      )}
    </>
  );
}

export default App;
