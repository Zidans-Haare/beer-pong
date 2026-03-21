const fs = require('fs');
const { runShell, commandExists } = require('../utils/shell');

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

async function generateNginx(answers, spinner) {
    const { domain, appPath, port, adminEmail } = answers;

    if (!commandExists('nginx')) {
        throw new Error('nginx is not installed. Run: sudo apt install nginx');
    }

    const config = buildNginxConfig({ domain, appPath, port });
    const tmpPath = `/tmp/nginx-${domain}`;
    const sitePath = `/etc/nginx/sites-available/${domain}`;
    const enabledPath = `/etc/nginx/sites-enabled/${domain}`;

    fs.writeFileSync(tmpPath, config, 'utf-8');

    spinner.text = 'Writing nginx config…';
    runShell(`sudo mv "${tmpPath}" "${sitePath}"`);
    runShell(`sudo ln -sf "${sitePath}" "${enabledPath}"`);

    spinner.text = 'Testing nginx config…';
    runShell('sudo nginx -t');

    spinner.text = 'Reloading nginx…';
    runShell('sudo nginx -s reload');

    // DNS check
    spinner.text = 'Checking DNS resolution…';
    let dnsOk = false;
    for (let i = 0; i < 3; i++) {
        try {
            const result = runShell(`dig +short "${domain}" 2>/dev/null || host "${domain}" 2>/dev/null | head -1`);
            if (result.trim()) { dnsOk = true; break; }
        } catch { /* ignore */ }
        if (i < 2) await new Promise(r => setTimeout(r, 2000));
    }

    if (!dnsOk) {
        spinner.warn(`DNS for ${domain} not yet resolved — skipping SSL.`);
        spinner.warn(`After DNS propagates, run: sudo certbot --nginx -d ${domain}`);
        return;
    }

    if (!commandExists('certbot')) {
        spinner.warn('certbot not found — skipping SSL.');
        spinner.warn('Install with: sudo apt install certbot python3-certbot-nginx');
        return;
    }

    spinner.text = 'Setting up SSL (Certbot)…';
    runShell(`sudo certbot --nginx -d "${domain}" --non-interactive --agree-tos -m "${adminEmail}" --redirect`);
}

module.exports = { generateNginx };
