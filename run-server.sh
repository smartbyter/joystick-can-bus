#!/bin/bash

# run from ed-ipc2030

# ssh pi@192.168.10.130
PATH_PROJECT=/home/pi/joystick-can-bus
export PATH=$PATH:$PATH_PROJECT

sudo ip link set canb0 down && sudo ip link set canb0 type can bitrate 1000000 && sudo ip link set canb0 up

deno run \
    --allow-net \
    --allow-run \
    --allow-read \
    $PATH_PROJECT/can2ws.ts
