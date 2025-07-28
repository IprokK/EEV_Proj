import React from 'react';

export default function Inventory({ items = [], onUse }) {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.7)',
      padding: 16,
      borderRadius: 8,
      color: '#fff',
      zIndex: 1000
    }}>
      <h3 style={{ marginTop: 0 }}>Инвентарь</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map(it => (
          <div key={it.item_id} onClick={() => onUse(it)} style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer' }}>
            <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 12 }}>{it.quantity}</span>
            {it.icon && <img src={it.icon} alt={it.name} style={{ maxWidth: '100%', maxHeight: '100%' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
