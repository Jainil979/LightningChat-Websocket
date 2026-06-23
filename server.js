// server.js
import uWS from 'uWebSockets.js';
import { PORT } from './config/env.js';
import { handleUpgrade } from './handlers/upgradeHandler.js';
import { handleOpen } from './handlers/openHandler.js';
import { handleMessage } from './handlers/messageHandler.js';
import { handleClose } from './handlers/closeHandler.js';

const app = uWS.App({});

app.ws('/*', {
  compression: 0,               // no compression overhead for control frames
  maxPayloadLength: 1024*12,       // tiny signalling packets only
  idleTimeout: 60,

  upgrade: handleUpgrade,
  open: handleOpen,
  message: handleMessage,
  close: handleClose,
});

app.listen('0.0.0.0', PORT, (socket) => {
  if (socket) {
    console.log(`WebSocket server running on port ${PORT}`);
  } else {
    console.error('Failed to listen');
    process.exit(1);
  }
});