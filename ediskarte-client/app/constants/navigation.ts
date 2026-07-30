import { router } from 'expo-router';

// Store state on global to ensure it's a singleton across Metro bundling and React Context boundaries
if (!(global as any).navigationState) {
  (global as any).navigationState = {
    lastActionTime: 0,
    setLoadingVisible: null as ((visible: boolean) => void) | null,
  };
}

const state = (global as any).navigationState;
const THROTTLE_DELAY = 1000; // 1 second block to prevent double-tap navigation

export const registerLoadingListener = (callback: (visible: boolean) => void) => {
  state.setLoadingVisible = callback;
};

export const showLoading = () => {
  if (state.setLoadingVisible) {
    state.setLoadingVisible(true);
  }
};

export const hideLoading = () => {
  if (state.setLoadingVisible) {
    state.setLoadingVisible(false);
  }
};

export const safePush = (href: any, params?: any) => {
  const now = Date.now();
  if (now - state.lastActionTime < THROTTLE_DELAY) {
    console.log("Blocked duplicate navigation (push):", href);
    return;
  }
  state.lastActionTime = now;
  
  showLoading();
  // Transition safety: auto-dismiss the overlay after 800ms
  setTimeout(() => {
    hideLoading();
  }, 800);

  if (params) {
    router.push({ pathname: href, params });
  } else {
    router.push(href);
  }
};

export const safeReplace = (href: any, params?: any) => {
  const now = Date.now();
  if (now - state.lastActionTime < THROTTLE_DELAY) {
    console.log("Blocked duplicate navigation (replace):", href);
    return;
  }
  state.lastActionTime = now;

  showLoading();
  setTimeout(() => {
    hideLoading();
  }, 800);

  if (params) {
    router.replace({ pathname: href, params });
  } else {
    router.replace(href);
  }
};

export const safeBack = () => {
  const now = Date.now();
  if (now - state.lastActionTime < THROTTLE_DELAY) {
    console.log("Blocked duplicate navigation (back)");
    return;
  }
  state.lastActionTime = now;
  
  showLoading();
  setTimeout(() => {
    hideLoading();
  }, 500); // Back transitions are usually quicker

  router.back();
};
