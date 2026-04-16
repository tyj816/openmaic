/**
 * 手动触发图片生成脚本
 * 
 * 用于已经生成但图片没有生成的教学设计
 * 在浏览器 Console 中运行
 */

(async function manualTriggerImageGeneration() {
  console.log('🎨 开始手动触发图片生成...\n');
  
  // 1. 获取设计数据
  const design = JSON.parse(sessionStorage.getItem('teachingDesignDraft'));
  
  if (!design) {
    console.error('❌ 没有找到设计数据');
    return;
  }
  
  console.log('✅ 找到设计数据');
  console.log('  设计 ID:', design.id);
  console.log('  总页数:', design.slides.length);
  
  // 2. 收集所有图片生成请求
  const allRequests = [];
  design.slides.forEach((slide, i) => {
    if (slide.mediaGenerations && slide.mediaGenerations.length > 0) {
      console.log(`  Slide ${i + 1}: ${slide.title} - ${slide.mediaGenerations.length} 个图片请求`);
      allRequests.push(...slide.mediaGenerations);
    }
  });
  
  if (allRequests.length === 0) {
    console.error('❌ 没有找到图片生成请求');
    return;
  }
  
  console.log(`\n📊 总共需要生成 ${allRequests.length} 张图片\n`);
  
  // 3. 逐个生成图片
  for (let i = 0; i < allRequests.length; i++) {
    const req = allRequests[i];
    console.log(`[${i + 1}/${allRequests.length}] 生成 ${req.elementId}...`);
    console.log(`  Prompt: "${req.prompt.slice(0, 60)}..."`);
    
    try {
      // 调用图片生成 API
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
        const error = await response.json();
        console.error(`  ❌ 生成失败:`, error);
        continue;
      }
      
      const data = await response.json();
      console.log(`  ✅ 生成成功: ${data.result.url}`);
      
      // 下载图片
      console.log(`  📥 下载图片...`);
      const imageResponse = await fetch(data.result.url);
      const imageBlob = await imageResponse.blob();
      
      // 创建 object URL
      const objectUrl = URL.createObjectURL(imageBlob);
      console.log(`  ✅ Object URL: ${objectUrl}`);
      
      // 存储到 IndexedDB
      const stageId = `teaching_${design.id}`;
      const dbRequest = indexedDB.open('openmaic-db', 1);
      
      dbRequest.onsuccess = function(event) {
        const db = event.target.result;
        
        // 确保 mediaFiles 表存在
        if (!db.objectStoreNames.contains('mediaFiles')) {
          console.warn('  ⚠️  mediaFiles 表不存在，跳过存储');
          return;
        }
        
        const transaction = db.transaction(['mediaFiles'], 'readwrite');
        const store = transaction.objectStore('mediaFiles');
        
        const mediaFile = {
          key: `${stageId}::${req.elementId}`,
          stageId: stageId,
          elementId: req.elementId,
          blob: imageBlob,
          mimeType: imageBlob.type,
        };
        
        store.put(mediaFile);
        console.log(`  ✅ 已存储到 IndexedDB`);
      };
      
      dbRequest.onerror = function() {
        console.error('  ❌ 无法打开 IndexedDB');
      };
      
    } catch (error) {
      console.error(`  ❌ 生成失败:`, error.message);
    }
    
    // 等待一下，避免请求过快
    if (i < allRequests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n✅ 所有图片生成完成！');
  console.log('\n💡 下一步:');
  console.log('  1. 刷新页面（F5）');
  console.log('  2. 查看工作区预览');
  console.log('  3. 导出 PPT 验证图片是否正确嵌入');
})();
