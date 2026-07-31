import io, { Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socketInstance: Socket | null = null;
const listeners = new Map<string, Set<(...args: any[]) => void>>();

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`, {
      transports: ["websocket"],
      autoConnect: false,
    });

    socketInstance.onAny((event, ...args) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach((listener) => {
          try {
            listener(...args);
          } catch (e) {
            console.error(`Error in socket listener for ${event}:`, e);
          }
        });
      }
    });
  }
  return socketInstance;
};

export const connectSocket = async () => {
  const socket = getSocket();
  if (socket.connected) return socket;

  const token = await AsyncStorage.getItem("token");
  const userId = await AsyncStorage.getItem("currentUserId");

  if (token && userId) {
    socket.auth = { token };
    socket.connect();
    
    socket.off("connect");
    socket.on("connect", () => {
      socket.emit("register_user", userId);
    });
    
    if (socket.connected) {
      socket.emit("register_user", userId);
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    listeners.clear();
  }
};

export const addSocketListener = (event: string, callback: (...args: any[]) => void) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);
  
  const socket = getSocket();
  socket.off(event);
  socket.on(event, (...args: any[]) => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((l) => l(...args));
    }
  });
};

export const removeSocketListener = (event: string, callback: (...args: any[]) => void) => {
  const eventListeners = listeners.get(event);
  if (eventListeners) {
    eventListeners.delete(callback);
    if (eventListeners.size === 0) {
      listeners.delete(event);
      const socket = getSocket();
      socket.off(event);
    }
  }
};


