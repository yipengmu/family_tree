/**
 * 清除应用缓存的工具函数
 */

// 清除localStorage中的租户相关缓存
export const clearTenantCache = () => {
  console.log('🧹 开始清除租户缓存...');
  
  // 清除当前租户缓存
  localStorage.removeItem('current_tenant');
  localStorage.removeItem('tenant_list');
  localStorage.removeItem('guest_mode');
  
  // 清除sessionStorage中的相关缓存
  sessionStorage.clear();
  
  // 如果使用了IndexedDB或其他存储，也可以在这里清除
  
  console.log('✅ 租户缓存清除完成');
};

// 清除应用的所有缓存
export const clearAllCache = () => {
  console.log('🧹 开始清除所有应用缓存...');
  
  // 清除localStorage
  localStorage.clear();
  
  // 清除sessionStorage
  sessionStorage.clear();
  
  // 如果有service worker，尝试清除缓存
  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) {
        caches.delete(name);
        console.log(`🗑️ 删除缓存: ${name}`);
      }
    });
  }
  
  console.log('✅ 所有应用缓存清除完成');
};

// 清除特定缓存项
export const clearSpecificCache = (keys) => {
  console.log('🧹 开始清除指定缓存项...');
  
  keys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    console.log(`🗑️ 删除缓存项: ${key}`);
  });
  
  // 如果有使用内存缓存，也需要清除
  if (window.cacheManager) {
    if (typeof window.cacheManager.clear === 'function') {
      window.cacheManager.clear();
    } else {
      // 尝试清除特定的缓存键
      keys.forEach(key => {
        window.cacheManager.remove(key);
      });
    }
  }
  
  console.log('✅ 指定缓存项清除完成');
};