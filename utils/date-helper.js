export function toPersianDate(date) {
    if (!date) return '---';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return d.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        return date;
    }
}

export function toPersianDateTime(date) {
    if (!date) return '---';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return d.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return date;
    }
}

export function formatDateForInput(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

export function getDaysAgo(date) {
    if (!date) return 'نامشخص';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'نامشخص';
        const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'امروز';
        if (diff === 1) return 'دیروز';
        if (diff < 7) return `${diff} روز پیش`;
        if (diff < 30) return `${Math.floor(diff / 7)} هفته پیش`;
        if (diff < 365) return `${Math.floor(diff / 30)} ماه پیش`;
        return `${Math.floor(diff / 365)} سال پیش`;
    } catch (e) {
        return 'نامشخص';
    }
}

export function compareDates(a, b) {
    return new Date(a) - new Date(b);
}
