const CAN_INTERFACE = "canb0";
const WS_PORT = 8080;

// Запускаем candump
const candump = new Deno.Command("candump", {
  args: ["-L", CAN_INTERFACE],
  stdin: "null",
  stdout: "piped",
  stderr: "inherit",
}).spawn();

const reader = candump.stdout.getReader();
const decoder = new TextDecoder();

// Хранилище активных WebSocket соединений
const clients = new Set<WebSocket>();

// Парсим строку candump в JSON
function parseCanLine(line: string): object | null {
  // Формат: (1712685432.123456) canb0 123#AABBCCDD

  const match = line.match(/\(([\d.]+)\)\s+\S+\s+([0-9A-Fa-f]+)#([0-9A-Fa-f]+)/);
  if (!match) return null;
  
  const [, timestamp, id, data] = match;
  
  return {
    timestamp: parseFloat(timestamp),
    id: parseInt(id, 16),
    id_hex: id,
    data: data,
    data_bytes: data.match(/.{2}/g)?.map(b => parseInt(b, 16)) || [],
    interface: CAN_INTERFACE,
    source: "canbus"
  };
}

// Обработка новых пакетов CAN
async function broadcastCanPackets() {
//   const encoder = new TextEncoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const lines = decoder.decode(value).trim().split('\n');

    for (let i = 0; i < lines.length; i += 1) {
        const packet = parseCanLine(lines[i]);
        
        if (packet && clients.size > 0) {
          const json = JSON.stringify(packet);
          
          // Рассылаем всем подключенным клиентам
          for (const client of clients) {
            try {
              await client.send(json);
            } catch (error) {
              console.error("Ошибка отправки клиенту:", error);
              clients.delete(client);
            }
          }
        }
    }
  }
}

// WebSocket сервер
function startWebSocketServer() {
  Deno.serve({ port: WS_PORT }, (req) => {
    // Обновляем соединение до WebSocket
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("WebSocket сервер для CAN шины", { status: 426 });
    }
    
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      console.log("Клиент подключен");
      clients.add(socket);
      
      // Отправляем приветственное сообщение
      socket.send(JSON.stringify({
        type: "connected",
        message: `Подключен к ${CAN_INTERFACE}`,
        timestamp: Date.now()
      }));
    };
    
    socket.onclose = () => {
      console.log("Клиент отключен");
      clients.delete(socket);
    };
    
    socket.onerror = (error) => {
      console.error("Ошибка WebSocket:", error);
      clients.delete(socket);
    };
    
    socket.onmessage = (event) => {
      // Обработка команд от клиентов
      try {
        const cmd = JSON.parse(event.data);
        if (cmd.command === "ping") {
          socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (e) {
        console.error("Ошибка парсинга команды:", e);
      }
    };
    
    return response;
  });
}

// Запуск сервера
console.log(`WebSocket сервер запущен на порту ${WS_PORT}`);
console.log(`Трансляция CAN интерфейса ${CAN_INTERFACE}`);
console.log(`Пример JSON формата:`);
console.log(`{
  "timestamp": 1712685432.123456,
  "id": 291,
  "id_hex": "123",
  "data": "AABBCCDD",
  "data_bytes": [170, 187, 204, 221],
  "interface": "canb0",
  "source": "canbus"
}`);

startWebSocketServer();
broadcastCanPackets();

// Graceful shutdown
const cleanup = () => {
  console.log("\nЗавершение работы...");
  candump.kill("SIGTERM");
  for (const client of clients) {
    client.close();
  }
  Deno.exit(0);
};

Deno.addSignalListener("SIGINT", cleanup);
Deno.addSignalListener("SIGTERM", cleanup);
