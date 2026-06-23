// services/presenceService.js

// userId (number) -> uWS.WebSocket
export const onlineUsers = new Map();

// userId (number) -> Set<number> (who this user is watching)
export const subscriptions = new Map();

// userId (number) -> Set<number> (who is watching this user)
export const watchers = new Map();

export function addUser(userId, ws) {
  onlineUsers.set(userId, ws);
  subscriptions.set(userId, new Set());
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

export function sendToUser(userId, data, isBinary = false) {

  const ws = onlineUsers.get(userId);
  if (ws) {
    ws.send(data, isBinary);
    return true;
  }
  return false;
}