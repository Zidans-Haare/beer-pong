#!/bin/bash
# Wartungsmodus aktivieren
read -p "Was passiert gerade? (Enter für leer): " MSG
read -p "Geschätzte Dauer in Minuten: " DURATION

START=$(date -Iseconds)

if [[ "$DURATION" =~ ^[0-9]+$ ]]; then
    END=$(date -d "+${DURATION} minutes" -Iseconds)
else
    END=""
fi

# JSON schreiben
JSON="{\"msg\":$(echo "$MSG" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),\"start\":\"$START\",\"end\":\"$END\"}"
echo "$JSON" > /home/htw/beer-pong/public/maintenance-msg.txt

touch /home/htw/beer-pong/public/maintenance.on
echo "Wartungsmodus: AN (Start: $START${END:+, Ende ca.: $END})"
