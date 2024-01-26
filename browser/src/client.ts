const ws = new WebSocket('ws://localhost:8080');
console.log('ws', ws)

ws.onopen = () => {
    console.log('Connected to server');

    ws.send('Hello, server!');
}

ws.onmessage = event => {
    console.log('Received message from server', event);
}

ws.onclose = () => {
    console.log('Disconnected from server');
}

ws.onerror = error => {
    console.error(error);
}
