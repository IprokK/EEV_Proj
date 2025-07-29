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
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: 4 }}>Предмет</th>
            <th style={{ textAlign: 'right', paddingBottom: 4 }}>Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.item_id} onClick={() => onUse(it)} style={{ cursor: 'pointer' }}>
              <td style={{ paddingRight: 12 }}>{it.name}</td>
              <td style={{ textAlign: 'right' }}>{it.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
