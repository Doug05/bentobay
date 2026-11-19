#!/bin/bash
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then echo "Node.js is required: https://nodejs.org"; read -n1 -r -p "Press any key..."; exit 1; fi
npm install && npm run dist && echo "Done. Installers are in the dist folder."
read -n1 -r -p "Press any key to close..."
