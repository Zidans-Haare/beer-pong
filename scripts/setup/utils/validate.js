/**
 * Validierungsfunktionen für Wizard-Eingaben.
 */

function validateDomain(value) {
    if (!value || !value.trim()) return 'Domain darf nicht leer sein';
    const domain = value.trim();
    // Einfache Domain-Validierung: keine Leerzeichen, mind. ein Punkt
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(domain)) {
        return 'Ungültige Domain (z.B. bier.olomek.com)';
    }
    return true;
}

function validateEmail(value) {
    if (!value || !value.trim()) return 'Email darf nicht leer sein';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        return 'Ungültige Email-Adresse';
    }
    return true;
}

function validatePort(value) {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        return 'Ungültiger Port (1–65535)';
    }
    return true;
}

function validatePath(value) {
    if (!value || !value.trim()) return 'Pfad darf nicht leer sein';
    if (!value.trim().startsWith('/')) return 'Pfad muss absolut sein (beginnt mit /)';
    return true;
}

module.exports = { validateDomain, validateEmail, validatePort, validatePath };
