#!/bin/bash

USER_NAME=$USER
DENO_PATH="/home/$USER/deno"

sudo cat > /etc/systemd/system/deno-server.service << EOF
[Unit]
Description=Deno Server Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${DENO_PATH}
ExecStart=${DENO_PATH}/run-server.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Перезагружаем systemd и включаем сервис
sudo systemctl daemon-reload
sudo systemctl enable deno-server.service
sudo systemctl start deno-server.service

echo "Сервис успешно установлен!"

sudo reboot
