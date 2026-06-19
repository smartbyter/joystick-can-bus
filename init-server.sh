#!/bin/bash

USER_NAME=pi
PROJECT_PATH="/home/pi/joystick-can-bus"

sudo cat > /etc/systemd/system/deno-server.service << EOF
[Unit]
Description=Deno Server Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${PROJECT_PATH}
ExecStart=${PROJECT_PATH}/run-server.sh
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
