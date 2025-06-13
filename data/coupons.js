let coupons = [
    { id: 1, code: 'NEWMEMBER', discountType: 'percentage', discountValue: 20, expiryDate: new Date('2090-12-31'), isActive: true },
    { id: 1, code: 'NEWSPACECAFEOP92', discountType: 'percentage', discountValue: 32, expiryDate: new Date('2090-12-31'), isActive: true }, 
];
let nextId = coupons.length + 1;

module.exports = {
    getAll: () => coupons,
    findByCode: (code) => coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.isActive && c.expiryDate > new Date()),
    addCoupon: ({ code, discountType, discountValue, expiryDate }) => {
        const newCoupon = {
            id: nextId++,
            code: code.toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue),
            expiryDate: new Date(expiryDate),
            isActive: true
        };
        coupons.push(newCoupon);
        return newCoupon;
    }
};