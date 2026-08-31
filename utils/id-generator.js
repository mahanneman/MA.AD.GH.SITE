export function generateId(prefix, length = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function generateOrderId() {
    return generateId('ORD', 8);
}

export function generateProductId() {
    return generateId('PRD', 4);
}

export function generateArticleId() {
    return generateId('ART', 4);
}

export function generateArchiveId() {
    return generateId('ARC', 4);
}

export function generatePaymentId() {
    return generateId('PAY', 6);
}

export function generateUserId() {
    const num = Math.floor(Math.random() * 9000) + 1000;
    return String(num);
}

export function generateTrackingCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
