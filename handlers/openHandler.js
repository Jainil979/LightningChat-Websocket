// handlers/openHandler.js
import { addUser, watchers, onlineUsers } from '../services/presenceService.js';
import { encodePresence } from '../utils/binaryProtocol.js';

export function handleOpen(ws) {
  const userId = ws.userId;                     // number

  addUser(userId, ws);

  // Notify self (binary)
  ws.send(encodePresence(userId, true), true);

  // Notify all watchers that this user is now online
  const watcherSet = watchers.get(userId);
  if (watcherSet && watcherSet.size > 0) {
    const onlineMsg = encodePresence(userId, true);
    for (const watcherId of watcherSet) {
      const watcherWs = onlineUsers.get(watcherId);
      if (watcherWs) {
        watcherWs.send(onlineMsg, true);
      }
    }
  }
}