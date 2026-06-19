// Загружаем скомпилированную библиотеку
const lib = Deno.dlopen("/data/projects/deno/joystick/libjoystick.so", {
    create_uinput_device: { parameters: [], result: "i32" },
    send_axis: { parameters: ["i32", "i32", "i32"], result: "void" },
    send_button: { parameters: ["i32", "i32", "i32"], result: "void" },
    send_sync: { parameters: ["i32"], result: "void" },
    destroy_device: { parameters: ["i32"], result: "void" }
});

const ABS_X = 0x00
const ABS_Y = 0x01
const ABS_RX = 0x03
const ABS_RY = 0x04
const BTN_A = 0x130
const BTN_B = 0x131
const BTN_X = 0x133

// Создаём виртуальный джойстик
console.log("🎮 Создание виртуального джойстика...");
const fd = lib.symbols.create_uinput_device();

if (fd < 0) {
    console.error("❌ Не удалось создать устройство. Запустите с sudo или настройте права:");
    console.error("   ./init.sh");
    console.error("   Перезагрузка выполнится автоматически");
    Deno.exit(1);
}

console.log(`✅ Виртуальный джойстик создан (fd: ${fd})`);
console.log("Тестирование: jstest /dev/input/js0\n");

// Преобразование знакового 16-битного значения в диапазон 0-255
// Вход: int16 (-32768 до 32767)
// Выход: 0-255 (0 = максимум влево, 127 = центр, 255 = максимум вправо)
function scaleToUinput(value: number, inverse = false): number {
    // Преобразуем в знаковое 16-битное
    let signedValue = value;
    if (signedValue > 0x7FFF) {
        signedValue = signedValue - 0x10000; // Преобразуем из беззнакового в знаковое
    }
    
    // Диапазон: -32768 до 32767
    const MIN = inverse ? 32767 : -32768;
    const MAX = inverse ? -32768 : 32767;
    // const CENTER = 0;
    
    // Нормализуем относительно центра и масштабируем в 0-255
    // -32768 -> 0, 0 -> 127, 32767 -> 255
    const normalized = (signedValue - MIN) / (MAX - MIN);
    return Math.floor(normalized * 255);
}

function getArgValue(flag: string): string | undefined {
    const index = Deno.args.indexOf(flag);
    if (index !== -1 && Deno.args.length > index + 1) {
        return Deno.args[index + 1];
    }
    return undefined;
}

const ip = getArgValue("--ip") || Deno.env.get("CAN_IP") || "localhost";
const port = getArgValue("--port") || Deno.env.get("CAN_PORT") || "8080";
const WS_URL = `ws://${ip}:${port}`;

// Подключаемся к WebSocket CAN серверу
const ws = new WebSocket(WS_URL);

ws.onopen = () => {
    console.log('✅ Подключен к CAN серверу');
};

ws.onmessage = (event) => {
    try {
        const packet = JSON.parse(event.data);
        const bytes = packet.data_bytes;
        
        if (!bytes) return;
        
        if (bytes.length === 8) {
            // Парсим значения с CAN шины

            // Обработка кнопок
            const buttons = bytes[0];

            lib.symbols.send_button(fd, BTN_A, buttons & 1);
            lib.symbols.send_button(fd, BTN_B, (buttons >> 1) & 1);
            lib.symbols.send_button(fd, BTN_X, (buttons >> 2) & 1);
            
            const axisX = (bytes[2] << 8) | bytes[3];
            const axisY = (bytes[4] << 8) | bytes[5];
            const axisZ = (bytes[6] << 8) | bytes[7];
            
            // Отправляем оси в виртуальный джойстик
            lib.symbols.send_axis(fd, ABS_X, scaleToUinput(axisX));
            lib.symbols.send_axis(fd, ABS_Y, scaleToUinput(axisY, true));
            lib.symbols.send_axis(fd, ABS_RX, scaleToUinput(axisZ));
            
            // Отправляем синхронизацию (применяем изменения)
            lib.symbols.send_sync(fd);

            // if (Math.random() < 0.05) {
            //     console.log(`X:${axisX} Y:${axisY} Z:${axisZ}`);
            // }
            
        } else if (bytes.length === 2) {
            const axisZ1 = (bytes[0]) << 8 | bytes[1];
            lib.symbols.send_axis(fd, ABS_RY, scaleToUinput(axisZ1, true));
            // Отправляем синхронизацию (применяем изменения)
            lib.symbols.send_sync(fd);

            // console.log('axisZ1', axisZ1.toString(16))

            // if (Math.random() < 0.05) {
            //     console.log(`Z1:${axisZ1}`);
            // }
        }
        
    } catch (err) {
        console.error("Ошибка:", err);
    }
};

ws.onerror = (err) => {
    console.error("❌ WebSocket ошибка:", err);
};

ws.onclose = () => {
    console.log("Соединение закрыто");
};

// Корректное завершение
const cleanup = () => {
    console.log("\n🛑 Завершение работы...");
    lib.symbols.destroy_device(fd);
    Deno.exit(0);
};

Deno.addSignalListener("SIGINT", cleanup);
Deno.addSignalListener("SIGTERM", cleanup);

console.log("🚀 Эмулятор запущен. Ожидание данных от CAN...");
await new Promise(() => {});
