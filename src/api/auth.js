// src/api/auth.js
export async function registerStep1(data) {
    const r = await fetch('/api/register-step1', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    return r.json();
  }
  export async function registerStep2(data, token) {
    const r = await fetch('/api/register-step2', {
      method:'POST', headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return r.json();
  }
  export async function registerStep3(data, token) {
    const r = await fetch('/api/register-step3', {
      method:'POST', headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return r.json();
  }
  export async function login(data) {
    const r = await fetch('/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    return r.json();
  }
  