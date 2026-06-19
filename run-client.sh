#!/bin/bash

# run from pc

jstest-gtk &

# export CAN_IP=192.168.10.130
# deno run --allow-net --allow-ffi --unstable-ffi --allow-read ./can2uinput.ts

deno run \
    --allow-net \
    --allow-ffi \
    --unstable-ffi \
    --allow-read \
    ~/projects/joystick-can-bus/ws2uinput.ts \
    --ip 192.168.10.130 \
    --port 8080
