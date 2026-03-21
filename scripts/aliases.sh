# Beer Pong — Shell Aliases
# Automatically added by the setup wizard.
# Remove this block if you uninstall Beer Pong.

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" --no-use

alias bp-update='bash ~/beer-pong/scripts/update.sh'
alias bp-doctor='bash ~/beer-pong/scripts/doctor.sh'
alias bp-doctor-fix='bash ~/beer-pong/scripts/doctor.sh --fix'
alias bp-logs='pm2 logs beer-pong'
alias bp-restart='set -a; . ~/beer-pong/.env; set +a && pm2 restart beer-pong --update-env'
alias bp-status='pm2 status'
alias bp-maint-on='touch ~/beer-pong/public/maintenance.on && echo "Maintenance mode ON"'
alias bp-maint-off='rm -f ~/beer-pong/public/maintenance.on && echo "Maintenance mode OFF"'

# Welcome message on SSH login
echo -e ""
echo -e "  \e[1m\e[35m🍺  Beer Pong\e[0m"
echo -e "  \e[2m────────────────────────────────\e[0m"
echo -e "  \e[36mbp-update\e[0m      update to latest version"
echo -e "  \e[36mbp-doctor\e[0m      check for issues"
echo -e "  \e[36mbp-doctor-fix\e[0m  check + auto-fix issues"
echo -e "  \e[36mbp-logs\e[0m        view live logs"
echo -e "  \e[36mbp-status\e[0m      PM2 process status"
echo -e "  \e[36mbp-restart\e[0m     restart app"
echo -e "  \e[36mbp-maint-on\e[0m    enable maintenance mode"
echo -e "  \e[36mbp-maint-off\e[0m   disable maintenance mode"
echo -e "  \e[2m────────────────────────────────\e[0m"
echo -e ""
