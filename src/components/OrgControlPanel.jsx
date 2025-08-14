import React, { useState, useEffect } from 'react';

export default function OrgControlPanel({ orgId, onClose }) {
  const [org, setOrg] = useState(null);
  const [menuText, setMenuText] = useState('{}');
  const [workHours, setWorkHours] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    async function load() {
      try {
        const oRes = await fetch(`/api/organizations/${orgId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!oRes.ok) throw new Error('org fetch');
        const orgData = await oRes.json();
        setOrg(orgData);
        const sRes = await fetch(`/api/organizations/${orgId}/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sRes.ok) {
          const data = await sRes.json();
          // сервер уже нормализует menu в массив — красиво показывать в textarea как объект:
          const asObject = Array.isArray(data.menu)
            ? Object.fromEntries(data.menu.map(it => [it.key, { title: it.title, price: it.price, itemId: it.itemId }]))
            : (data.menu || {});
          setMenuText(JSON.stringify(asObject, null, 2));
          setWorkHours(data.work_hours || '');
        }
      } catch (e) {
        console.error('Failed to load organization info', e);
      }
    }
    load();
  }, [orgId]);

  async function save() {
    let menu;
    try {
      menu = JSON.parse(menuText); // отправляем как объект — сервер понимает и объект, и массив
    } catch (e) {
      alert('Неверный JSON меню');
      return;
    }
    const token = localStorage.getItem('token');
    await fetch(`/api/organizations/${orgId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ menu, workHours })
    });
    onClose();
  }

  if (!org) return null;
  const me = JSON.parse(sessionStorage.getItem('user_profile') || '{}');
  const isOwner =
    String(org.owner_id ?? '') === String(me.id ?? '') ||
    String(org.owner ?? '') === String(me.id ?? '') || // совместимость, если owner — текстом ид
    String(org.owner ?? '') === String(me.email ?? ''); // на всякий случай

  return (
    <div style={{
      position: 'absolute', top: 20, right: 20,
      background: 'rgba(0,0,0,0.85)', color: '#fff',
      padding: 16, borderRadius: 8, minWidth: 280, zIndex: 3000
    }}>
      <h3 style={{ marginTop: 0 }}>{org.name} — управление</h3>
      {isOwner ? (
        <>
          <label style={{ display: 'block', marginBottom: 6 }}>
            Часы работы:
            <input value={workHours} onChange={e => setWorkHours(e.target.value)} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginBottom: 6 }}>Меню (JSON):</label>
          <textarea value={menuText} onChange={e => setMenuText(e.target.value)} style={{ width: '100%', height: 160 }} />
          <div style={{ marginTop: 10 }}>
            <button onClick={save} style={{ marginRight: 8 }}>Сохранить</button>
            <button onClick={onClose}>Закрыть</button>
          </div>
        </>
      ) : (
        <>
          <p>Вы не владелец этой организации.</p>
          <button onClick={onClose}>Закрыть</button>
        </>
      )}
    </div>
  );
}
