// services/presenceService.js

// userId (number) -> uWS.WebSocket
export const onlineUsers = new Map();

// userId (number) -> Set<number> (who this user is watching)
export const subscriptions = new Map();

// userId (number) -> Set<number> (who is watching this user)
export const watchers = new Map();

export function addUser(userId, ws) {
  const oldWs = onlineUsers.get(userId);

  // 1. Store the new socket
  onlineUsers.set(userId, ws);

  // 2. Preserve subscriptions across reconnects – only initialise if missing
  if (!subscriptions.has(userId)) {
    subscriptions.set(userId, new Set());
  }

  // 3. Close any old, lingering socket so its close handler becomes a no‑op
  if (oldWs && oldWs !== ws) {
    try { oldWs.close(); } catch (e) {}
  }
}

export function removeUser(userId) {
  onlineUsers.delete(userId);

  const set = subscriptions.get(userId);

  subscriptions.delete(userId);

  // Remove this user from the watchers sets of every user they were watching
  if (set && set.size > 0) {
    for (const watchedId of set) {
      const watcherSet = watchers.get(watchedId);
      if (watcherSet) {
        watcherSet.delete(userId);
        if (watcherSet.size === 0) watchers.delete(watchedId);
      }
    }
  }

  // 4. Delete the entry that lists who was watching this user (previously missing)
  watchers.delete(userId);
}

export function setSubscriptions(userId, userIds) {
  // 1. Remove old watcher entries
  const oldSet = subscriptions.get(userId);
  if (oldSet) {
    for (const watchedId of oldSet) {
      const watcherSet = watchers.get(watchedId);
      if (watcherSet) {
        watcherSet.delete(userId);
        if (watcherSet.size === 0) watchers.delete(watchedId);
      }
    }
  }

  // 2. Create new subscription set (all numbers)
  const newSet = new Set(userIds);   // userIds is already an array of numbers
  subscriptions.set(userId, newSet);

  // 3. Add watcher entries
  for (const watchedId of newSet) {
    if (!watchers.has(watchedId)) {
      watchers.set(watchedId, new Set());
    }
    watchers.get(watchedId).add(userId);
  }
}


// Safe sending – prevents crash if target socket is already closed
export function sendToUser(userId, data, isBinary = false) {
  const ws = onlineUsers.get(userId);
  if (ws) {
    try {
      ws.send(data, isBinary);
      return true;
    } catch (e) {
      // Socket closed between lookup and send – ignore, close handler will clean it
      return false;
    }
  }
  return false;
}