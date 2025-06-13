// data/products.js

let products = [
];

let nextId = products.length + 1;

module.exports = {
    getAll: () => products,

    getById: (id) => products.find(p => p.id === parseInt(id)),

    // Updated to handle the new 'purchaseLink' field from the form
    addProduct: ({ name, description, price, category, image, purchaseLink }) => {
        const newProduct = {
            id: nextId++,
            name,
            description,
            price: parseFloat(price),
            category,
            image,
            purchaseLink: purchaseLink || '' // Default to empty string if not provided
        };
        products.push(newProduct);
        return newProduct;
    },

    deleteProduct: (id) => {
        const productId = parseInt(id);
        const index = products.findIndex(p => p.id === productId);
        if (index > -1) {
            products.splice(index, 1);
            return true;
        }
        return false;
    }
};