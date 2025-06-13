// data/orders.js

// Sample data to start with.
let orders = [
];
let nextId = orders.length + 1;

module.exports = {
    getAll: () => orders,

    getById: (id) => orders.find(o => o.id === parseInt(id)),

    addOrder: ({ userId, cart, paymentMethod, transactionId }) => {
        const newOrder = {
            id: nextId++,
            userId: userId,
            date: new Date(),
            items: Object.values(cart.items).map(i => ({
                product: i.item,
                quantity: i.qty
            })),
            total: cart.finalPrice,
            status: 'Pending', // Default status for new orders
            paymentMethod: paymentMethod,
            transactionId: transactionId
        };
        orders.push(newOrder);
        return newOrder;
    },

    updateStatus: (id, status) => {
        const order = orders.find(o => o.id === parseInt(id));
        if (order) {
            order.status = status;
            return true;
        }
        return false;
    }
};