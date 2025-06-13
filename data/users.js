const bcrypt = require('bcryptjs');

let users = [
    // To create an admin, manually add one here before starting the server
    // { id: 1, name: 'Admin', email: 'admin@example.com', password: 'hashed_admin_password', role: 'admin' }
];
let nextId = users.length + 1;

// You'd need to pre-hash an admin password if you add one manually.
// To do that, you can temporarily add this to app.js and run it once:
// const bcrypt = require('bcryptjs');
// async function hashPass() { const hash = await bcrypt.hash('admin123', 10); console.log(hash); }
// hashPass();

module.exports = {
    getAll: () => users,
    findByEmail: (email) => users.find(u => u.email === email),
    findById: (id) => users.find(u => u.id === id),
    addUser: async ({ name, email, password }) => {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: nextId++,
            name,
            email,
            password: hashedPassword,
            role: email === 'admin@example.com' ? 'admin' : 'user' // Simple admin assignment
        };
        users.push(newUser);
        return newUser;
    }
};