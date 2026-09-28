#!/usr/bin/env bash
set -u
URL=http://localhost:5001/vakema/europe-west1/submitLead

echo '--- 1. invalid payload ---'
curl -s -X POST "$URL" -H 'Content-Type: application/json' \
  -d '{"name":"T","email":"bad","message":"short"}'
echo
echo '--- 2. valid payload ---'
curl -s -X POST "$URL" -H 'Content-Type: application/json' \
  -d '{"name":"Testas Testauskas","email":"t@t.lt","message":"Noriu pasiulymo del langu."}'
echo
echo '--- 3. GET (expect 405) ---'
curl -s -o /dev/null -w '%{http_code}\n' "$URL"
echo '--- 4. OPTIONS (expect 204) ---'
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS "$URL" -H 'Origin: https://vakema.lt'
echo '--- 5. honeypot ---'
curl -s -X POST "$URL" -H 'Content-Type: application/json' \
  -d '{"name":"Bot Botas","email":"bot@bot.lt","message":"siandien pigiai reklama","company":"spam"}'
echo
