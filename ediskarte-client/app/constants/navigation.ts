import { router } from 'expo-router';

let lastActionTime = 0;
const THROTTLE_DELAY = 1000; // 1 second block to prevent double-tap navigation

export const safePush = (href: any, params?: any) => {
  const now = Date.now();
  if (now - lastActionTime < THROTTLE_DELAY) {
    console.log("Blocked duplicate navigation (push):", href);
    return;
  }
  lastActionTime = now;
  if (params) {
    router.push({ pathname: href, params });
  } else {
    router.push(href);
  }
};

export const safeReplace = (href: any, params?: any) => {
  const now = Date.now();
  if (now - lastActionTime < THROTTLE_DELAY) {
    console.log("Blocked duplicate navigation (replace):", href);
    return;
  }
  lastActionTime = now;
  if (params) {
    router.replace({ pathname: href, params });
  } else {
    router.replace(href);
  }
};

export const safeBack = () => {
  const now = Date.now();
  if (now - lastActionTime < THROTTLE_DELAY) {
    console.log("Blocked duplicate navigation (back)");
    return;
  }
  lastActionTime = now;
  router.back();
};
