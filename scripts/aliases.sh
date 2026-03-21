# Beer Pong — Shell Aliases
# Automatically added by the setup wizard.
# Remove this block if you uninstall Beer Pong.

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" --no-use

alias bp-update='bash ~/beer-pong/scripts/update.sh'
alias bp-doctor='bash ~/beer-pong/scripts/doctor.sh'
alias bp-logs='pm2 logs beer-pong'
alias bp-restart='set -a; . ~/beer-pong/.env; set +a && pm2 restart beer-pong --update-env'
alias bp-status='pm2 status'
alias bp-maint-on='touch ~/beer-pong/public/maintenance.on && echo "Maintenance mode ON"'
alias bp-maint-off='rm -f ~/beer-pong/public/maintenance.on && echo "Maintenance mode OFF"'
