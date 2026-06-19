#!/bin/bash

# run from ed-ipc2030

# ssh pi@192.168.10.130
export PATH=$PATH:/home/pi/deno

sudo ip link set canb0 down && sudo ip link set canb0 type can bitrate 1000000 && sudo ip link set canb0 up

deno run \
    --allow-net \
    --allow-run \
    --allow-read \
    /home/pi/deno/can2ws.ts
