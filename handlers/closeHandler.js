// handlers/closeHandler.js
import { removeUser, watchers, onlineUsers } from '../services/presenceService.js';
import { encodePresence } from '../utils/binaryProtocol.js';

export function handleClose(ws) {
  const userId = ws.userId;               // number
  const lastSeen = Date.now();

  // Notify watchers BEFORE removing the user
  const watcherSet = watchers.get(userId);
  if (watcherSet && watcherSet.size > 0) {
    const offlineMsg = encodePresence(userId, false, lastSeen);
    for (const watcherId of watcherSet) {
      const watcherWs = onlineUsers.get(watcherId);
      if (watcherWs) {
        watcherWs.send(offlineMsg, true);
      }
    }
  }

  // Clean up all maps
  removeUser(userId);
}