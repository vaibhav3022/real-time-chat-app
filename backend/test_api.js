const API_URL = 'http://localhost:5000/task5/api';

async function testAuth() {
    try {
        console.log('🔄 Testing Login...');
        // Login with a known user (or create one if needed, but let's assume one exists or login fails)
        // You might need to adjust credentials if you know them. 
        // If not, we can try to signup a dummy user.
        const uniqueId = Date.now();
        const user = {
            name: `TestUser${uniqueId}`,
            email: `test${uniqueId}@example.com`,
            password: 'password123'
        };

        console.log(`📝 Registering new user: ${user.email}`);
        const signupRes = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        const signupData = await signupRes.json();

        if (signupData.success) {
            console.log('✅ Signup Successful:', signupData.user);
            const token = signupData.token;

            console.log('🔄 Testing /me endpoint...');
            const meRes = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const meData = await meRes.json();

            if (meData.success) {
                console.log('✅ /me Endpoint Working:', meData.user);
            } else {
                console.error('❌ /me Endpoint Failed:', meData);
            }

            console.log('🔄 Testing /users endpoint...');
            const usersRes = await fetch(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const usersData = await usersRes.json();

            if (usersData.success) {
                console.log(`✅ /users Endpoint Working. Count: ${usersData.count}`);
            } else {
                console.error('❌ /users Endpoint Failed:', usersData);
            }

        } else {
            console.error('❌ Signup Failed:', signupData);
        }

    } catch (error) {
        console.error('❌ API Error:', error);
    }
}

testAuth();
