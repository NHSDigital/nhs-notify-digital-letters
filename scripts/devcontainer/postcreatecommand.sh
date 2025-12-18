#!/bin/bash

echo 'sorting certs'
sudo cp -nr /home/ca-certificates/. /usr/local/share/ca-certificates
sudo update-ca-certificates
echo 'sorted certs'

echo 'Installing development tools'
npm install -g markdownlint-cli editorconfig-checker
echo 'Installed development tools'
