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

export const getUsersStatus = async (token) => {
    try {
        const response = await fetch('/api/users/status', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users status');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching users status:', error);
        throw error;
    }
};

export const loadUserInfo = async (userId, token) => {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching user info:', error);
        throw error;
    }
};
  