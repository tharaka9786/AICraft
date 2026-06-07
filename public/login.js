document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    // Toggle between Login and Signup forms
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        const btn = loginForm.querySelector('button');
        
        btn.innerText = 'Signing In...';
        errorDiv.innerText = '';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('aicraft_token', data.token);
                // Redirect to homepage after login
                window.location.href = '/';
            } else {
                errorDiv.innerText = data.error || 'Login failed.';
            }
        } catch (err) {
            errorDiv.innerText = 'Network error. Please try again.';
        } finally {
            btn.innerText = 'Sign In';
        }
    });

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorDiv = document.getElementById('signup-error');
        const btn = signupForm.querySelector('button');
        
        btn.innerText = 'Creating Account...';
        errorDiv.innerText = '';

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('aicraft_token', data.token);
                // Redirect to homepage after signup
                window.location.href = '/';
            } else {
                errorDiv.innerText = data.error || 'Signup failed.';
            }
        } catch (err) {
            errorDiv.innerText = 'Network error. Please try again.';
        } finally {
            btn.innerText = 'Create Account';
        }
    });
});
