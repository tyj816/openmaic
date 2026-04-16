/**
 * 完整的图片修复脚本
 * 在浏览器 Console 中运行
 */

(async function fixImagesComplete() {
  console.log('🔧 开始修复图片显示问题...\n');
  
  // 1. 获取设计数据
  const design = JSON.parse(sessionStorage.getItem('teachingDesignDraft'));
  
  if (!design) {
    console.error('❌ 没有找到设计数据');
    return;
  }
  
  const stageId = `teaching_${design.id}`;
  console.log('✅ 设计 ID:', design.id);
  console.log('✅ Stage ID:', stageId);
  
  // 2. 收集所有图片生成请求
  const allRequests = [];
  design.slides.forEach((slide) => {
    if (slide.mediaGenerations && slide.mediaGenerations.length > 0) {
      allRequests.push(...slide.mediaGenerations);
    }
  });
  
  console.log(`\n📊 需要生成 ${allRequests.length} 张图片\n`);
  
  // 3. 打开 IndexedDB
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('openmaic-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('mediaFiles')) {
        db.createObjectStore('mediaFiles', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('mediaTasks')) {
        db.createObjectStore('mediaTasks', { keyPath: 'key' });
      }
    };
  });
  
  console.log('✅ IndexedDB 已打开\n');
  
  // 4. 逐个生成并存储图片
  for (let i = 0; i < allRequests.length; i++) {
    const req = allRequests[i];
    console.log(`[${i + 1}/${allRequests.length}] 处理 ${req.elementId}...`);
    
    try {
      // 生成图片
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-image-provider': 'qwen-image',
          'x-image-model': 'qwen-image-plus',
        },
        body: JSON.stringify({
          prompt: req.prompt,
          aspectRatio: req.aspectRatio || '16:9',
        })
      });
      
      if (!response.ok) {
        console.error(`  ❌ API 调用失败`);
        continue;
      }
      
      const data = await response.json();
      console.log(`  ✅ 图片生成成功`);
      
      // 下载图片
      const imageResponse = await fetch(data.result.url);
      const imageBlob = await imageResponse.blob();
      const objectUrl = URL.createObjectURL(imageBlob);
      
      // 存储到 IndexedDB - mediaFiles
      const tx1 = db.transaction(['mediaFiles'], 'readwrite');
      const store1 = tx1.objectStore('mediaFiles');
      await new Promise((resolve, reject) => {
        const request = store1.put({
          key: `${stageId}::${req.elementId}`,
          stageId: stageId,
          elementId: req.elementId,
          blob: imageBlob,
          mimeType: imageBlob.type,
        });
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      console.log(`  ✅ 已存储到 mediaFiles`);
      
      // 存储到 IndexedDB - mediaTasks
      const tx2 = db.transaction(['mediaTasks'], 'readwrite');
      const store2 = tx2.objectStore('mediaTasks');
      await new Promise((resolve, reject) => {
        const request = store2.put({
          key: `${stageId}::${req.elementId}`,
          stageId: stageId,
          elementId: req.elementId,
          type: 'image',
          prompt: req.prompt,
          status: 'done',
          objectUrl: objectUrl,
          params: {
            aspectRatio: req.aspectRatio || '16:9',
          },
        });
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      console.log(`  ✅ 已存储到 mediaTasks`);
      console.log(`  📎 Object URL: ${objectUrl}\n`);
      
    } catch (error) {
      console.error(`  ❌ 处理失败:`, error.message);
    }
    
    // 等待一下
    if (i < allRequests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  db.close();
  
  console.log('\n✅ 所有图片已生成并存储到 IndexedDB');
  console.log('\n🔄 正在刷新页面...');
  
  // 刷新页面
  setTimeout(() => {
    window.location.reload();
  }, 1000);
})();
