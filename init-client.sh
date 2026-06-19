#!/bin/bash

sudo groupadd uinput
sudo usermod -aG uinput $USER
#sudo usermod -aG input $USER
echo 'KERNEL=="uinput", GROUP="uinput", MODE="0660", OPTIONS+="static_node=uinput"' | sudo tee /etc/udev/rules.d/99-uinput.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
sudo modprobe uinput
echo 'uinput' | sudo tee /etc/modules-load.d/uinput.conf

gnome-session-quit --reboot

#check after reboot
#ls -l /dev/uinput
#cd ~/projects/deno/joystick
#nautilus ~/projects/deno/joystick

#cd ~/projects/deno/joystick
#./run-client.sh


