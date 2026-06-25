// handlers/closeHandler.js
import { removeUser, watchers, onlineUsers, sendToUser } from '../services/presenceService.js';
import { encodePresence } from '../utils/binaryProtocol.js';

export function handleClose(ws) {
  const userId = ws.userId;

  // 🔒 IGNORE if this socket is no longer the active connection
  if (onlineUsers.get(userId) !== ws) return;
  
  const lastSeen = Date.now();

  // Notify watchers BEFORE removing the user
  const watcherSet = watchers.get(userId);
  if (watcherSet && watcherSet.size > 0) {
    const offlineMsg = encodePresence(userId, false, lastSeen);
    for (const watcherId of watcherSet) {
      sendToUser(watcherId, offlineMsg, true);   // safe – no crash on dead sockets
    }
  }

  // Complete cleanup – now also deletes watchers entry for this user
  removeUser(userId);
}