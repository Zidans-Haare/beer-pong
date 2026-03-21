function validateDomain(value) {
    if (!value || !value.trim()) return 'Domain cannot be empty';
    const domain = value.trim();
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(domain)) {
        return 'Invalid domain (e.g. beerping.example.com)';
    }
    return true;
}

function validateEmail(value) {
    if (!value || !value.trim()) return 'Email cannot be empty';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        return 'Invalid email address';
    }
    return true;
}

function validatePort(value) {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        return 'Invalid port (1–65535)';
    }
    return true;
}

function validatePath(value) {
    if (!value || !value.trim()) return 'Path cannot be empty';
    if (!value.trim().startsWith('/')) return 'Path must be absolute (starts with /)';
    return true;
}

module.exports = { validateDomain, validateEmail, validatePort, validatePath };
