#!/bin/bash

echo 'sorting certs'
sudo cp -nr /home/ca-certificates/. /usr/local/share/ca-certificates
sudo update-ca-certificates
echo 'sorted certs'
