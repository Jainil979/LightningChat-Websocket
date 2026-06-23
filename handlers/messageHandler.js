// handlers/messageHandler.js
import { setSubscriptions, sendToUser, onlineUsers } from '../services/presenceService.js';
import {
  TYPE_SUBSCRIBE, TYPE_PRESENCE, TYPE_SIGNAL,
  TYPE_KEY_EXCHANGE_INIT, TYPE_KEY_EXCHANGE_REPLY, TYPE_RELAY,
  encodePresence,
  decodeSubscribePayload,
  decodeSignalFromClient, encodeSignalToReceiver,
  decodeRelayFromClient, encodeRelayToReceiver,
  decodeKeyExchangeFromClient, encodeKeyExchangeToReceiver,
  encodeAckToTarget, decodeAckFromClient, TYPE_DELIVERY_ACK, TYPE_READ_ACK, encodeAckToReceiver,
  decodeVideoSignalFromClient, encodeVideoSignalToReceiver, TYPE_VIDEO_SIGNAL,
  TYPE_TYPING, decodeTypingFromClient, encodeTypingToReceiver
} from '../utils/binaryProtocol.js';


export function handleMessage(ws, message, isBinary) {
  const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);
  if (buf.length === 0) return;
  const type = buf[0];

  switch (type) {
    case TYPE_SUBSCRIBE: {
      const userIds = decodeSubscribePayload(buf.slice(1));
      setSubscriptions(ws.userId, userIds);
      for (const watchedId of userIds) {
        if (onlineUsers.has(watchedId)) {
          ws.send(encodePresence(watchedId, true), true);
        }
      }
      break;
    }

    case TYPE_SIGNAL: {
      const { targetId, subType, payload } = decodeSignalFromClient(buf);
      const forwardFrame = encodeSignalToReceiver(ws.userId, subType, payload);
      sendToUser(targetId, forwardFrame, true);
      break;
    }

    case TYPE_KEY_EXCHANGE_INIT:
    case TYPE_KEY_EXCHANGE_REPLY: {
      const subType = type;
      const { targetId, payload } = decodeKeyExchangeFromClient(buf);
      const forwardFrame = encodeKeyExchangeToReceiver(ws.userId, subType, payload);
      sendToUser(targetId, forwardFrame, true);
      break;
    }

    case TYPE_RELAY: {
      const { targetId, payload } = decodeRelayFromClient(buf);
      const forwardFrame = encodeRelayToReceiver(ws.userId, payload);
      sendToUser(targetId, forwardFrame, true);
      break;
    }

    case TYPE_DELIVERY_ACK:
    case TYPE_READ_ACK: {
      const ackType = type;
      const { targetId, msgId } = decodeAckFromClient(buf);
      const forwardFrame = encodeAckToReceiver(ws.userId, ackType, msgId);
      sendToUser(targetId, forwardFrame, true);
      break;
    }

    case TYPE_VIDEO_SIGNAL: {
      const { targetId, subType, payload } = decodeVideoSignalFromClient(buf);
      const forwardFrame = encodeVideoSignalToReceiver(ws.userId, subType, payload);
      sendToUser(targetId, forwardFrame, true);
      break;
    }

    case TYPE_TYPING: {
      const { targetId } = decodeTypingFromClient(buf);
      const forwardFrame = encodeTypingToReceiver(ws.userId);
      sendToUser(targetId, forwardFrame, true);
      break;
    }

    default:
      break;
  }
}