const fs = require('fs');
const path = require('path');
const { runShell, commandExists } = require('../utils/shell');

/**
 * Generiert den Nginx-Konfigurationsinhalt.
 */
function buildNginxConfig({ domain, appPath, port }) {
    return `server {
    server_name ${domain};

    set $maintenance 0;
    if (-f ${appPath}/public/maintenance.on) {
        set $maintenance 1;
    }

    location = /maintenance.html {
        root ${appPath}/public;
        internal;
    }

    location = /maintenance-msg.txt {
        root ${appPath}/public;
        add_header Cache-Control "no-store";
    }

    error_page 503 /maintenance.html;

    location / {
        if ($maintenance = 1) { return 503; }
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
`;
}

/**
 * Schreibt Nginx-Config und richtet SSL mit Certbot ein.
 */
async function generateNginx(answers, spinner) {
    const { domain, appPath, port, adminEmail } = answers;

    if (!commandExists('nginx')) {
        throw new Error('nginx ist nicht installiert. Bitte zuerst: sudo apt install nginx');
    }

    const config = buildNginxConfig({ domain, appPath, port });
    const tmpPath = `/tmp/nginx-${domain}`;
    const sitePath = `/etc/nginx/sites-available/${domain}`;
    const enabledPath = `/etc/nginx/sites-enabled/${domain}`;

    // Config in /tmp schreiben, dann mit sudo verschieben
    fs.writeFileSync(tmpPath, config, 'utf-8');

    spinner.text = 'Schreibe Nginx-Konfiguration…';
    runShell(`sudo mv "${tmpPath}" "${sitePath}"`);
    runShell(`sudo ln -sf "${sitePath}" "${enabledPath}"`);

    spinner.text = 'Prüfe Nginx-Konfiguration…';
    runShell('sudo nginx -t');

    spinner.text = 'Lade Nginx neu…';
    runShell('sudo nginx -s reload');

    // DNS-Prüfung
    spinner.text = 'Prüfe DNS-Auflösung…';
    let dnsOk = false;
    for (let i = 0; i < 3; i++) {
        try {
            const result = runShell(`dig +short "${domain}" 2>/dev/null || host "${domain}" 2>/dev/null | head -1`);
            if (result.trim()) { dnsOk = true; break; }
        } catch { /* ignorieren */ }
        if (i < 2) await new Promise(r => setTimeout(r, 2000));
    }

    if (!dnsOk) {
        spinner.warn(`DNS für ${domain} noch nicht aufgelöst. SSL wird übersprungen.`);
        spinner.warn('Führe nach DNS-Propagation manuell aus: sudo certbot --nginx -d ' + domain);
        return;
    }

    // SSL mit Certbot
    if (!commandExists('certbot')) {
        spinner.warn('certbot nicht gefunden — SSL wird übersprungen.');
        spinner.warn('Installiere mit: sudo apt install certbot python3-certbot-nginx');
        return;
    }

    spinner.text = 'Richte SSL ein (Certbot)…';
    runShell(`sudo certbot --nginx -d "${domain}" --non-interactive --agree-tos -m "${adminEmail}" --redirect`);
    spinner.text = `SSL eingerichtet für ${domain}`;
}

module.exports = { generateNginx };
