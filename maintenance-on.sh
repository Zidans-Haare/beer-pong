#!/bin/bash
# Wartungsmodus aktivieren
read -p "Was passiert gerade? (Enter für leer): " MSG
touch /home/htw/beer-pong/public/maintenance.on
if [ -n "$MSG" ]; then
    echo "$MSG" > /home/htw/beer-pong/public/maintenance-msg.txt
else
    rm -f /home/htw/beer-pong/public/maintenance-msg.txt
fi
echo "Wartungsmodus: AN"
