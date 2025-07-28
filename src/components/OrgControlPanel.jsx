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
          setMenuText(JSON.stringify(data.menu || {}, null, 2));
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
      menu = JSON.parse(menuText);
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
  const isOwner = String(org.owner) === String(me.id);

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.8)', color: '#fff', padding: 16, borderRadius: 8, minWidth: 250, zIndex: 1000 }}>
      <h3 style={{ marginTop: 0 }}>{org.name} управление</h3>
      {isOwner ? (
        <>
          <label style={{ display: 'block', marginBottom: 4 }}>
            Часы работы:
            <input value={workHours} onChange={e => setWorkHours(e.target.value)} style={{ width: '100%' }} />
          </label>
          <label style={{ display: 'block', marginBottom: 4 }}>Меню (JSON):</label>
          <textarea value={menuText} onChange={e => setMenuText(e.target.value)} style={{ width: '100%', height: 120 }} />
          <div style={{ marginTop: 8 }}>
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
