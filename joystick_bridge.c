#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <linux/input.h>
#include <linux/uinput.h>

int create_uinput_device() {
    int fd = open("/dev/uinput", O_WRONLY | O_NONBLOCK);
    if (fd < 0) return -1;
    
    // Включаем 4 оси (ABS_X, ABS_Y, ABS_RX, ABS_RY)
    ioctl(fd, UI_SET_EVBIT, EV_ABS);
    ioctl(fd, UI_SET_ABSBIT, ABS_X);
    ioctl(fd, UI_SET_ABSBIT, ABS_Y);
    ioctl(fd, UI_SET_ABSBIT, ABS_RX);
    ioctl(fd, UI_SET_ABSBIT, ABS_RY);
    
    // Включаем 3 кнопки
    ioctl(fd, UI_SET_EVBIT, EV_KEY);
    ioctl(fd, UI_SET_KEYBIT, BTN_A);
    ioctl(fd, UI_SET_KEYBIT, BTN_B);
    ioctl(fd, UI_SET_KEYBIT, BTN_X);
    
    // Описываем устройство
    struct uinput_user_dev uidev;
    memset(&uidev, 0, sizeof(uidev));
    snprintf(uidev.name, UINPUT_MAX_NAME_SIZE, "TS45F9-743ZB CAN Bus Joystick");
    uidev.id.bustype = BUS_USB;
    uidev.id.vendor = 0x2607;
    uidev.id.product = 0x0608;
    uidev.id.version = 1;
    
    // Диапазоны осей (0-255 для простоты)
    uidev.absmin[ABS_X] = 0;
    uidev.absmax[ABS_X] = 255;
    uidev.absmin[ABS_Y] = 0;
    uidev.absmax[ABS_Y] = 255;
    uidev.absmin[ABS_RX] = 0;
    uidev.absmax[ABS_RX] = 255;
    uidev.absmin[ABS_RY] = 0;
    uidev.absmax[ABS_RY] = 255;
    
    write(fd, &uidev, sizeof(uidev));
    ioctl(fd, UI_DEV_CREATE);
    
    return fd;
}

void send_axis(int fd, int axis, int value) {
    struct input_event ev;
    memset(&ev, 0, sizeof(ev));
    ev.type = EV_ABS;
    ev.code = axis;
    ev.value = value;
    write(fd, &ev, sizeof(ev));
}

void send_button(int fd, int button, int pressed) {
    struct input_event ev;
    memset(&ev, 0, sizeof(ev));
    ev.type = EV_KEY;
    ev.code = button;
    ev.value = pressed ? 1 : 0;
    write(fd, &ev, sizeof(ev));
}

void send_sync(int fd) {
    struct input_event ev;
    memset(&ev, 0, sizeof(ev));
    ev.type = EV_SYN;
    ev.code = SYN_REPORT;
    ev.value = 0;
    write(fd, &ev, sizeof(ev));
}

void destroy_device(int fd) {
    ioctl(fd, UI_DEV_DESTROY);
    close(fd);
}
