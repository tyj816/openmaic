/**
 * 浏览器端图片生成检查脚本
 * 
 * 在生成教学设计后，在浏览器 Console 中运行此脚本
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具（F12）
 * 2. 切换到 Console 标签
 * 3. 复制粘贴此脚本并回车
 */

(function checkImageGeneration() {
  console.log('🔍 开始检查图片生成状态...\n');
  
  // 1. 检查设计对象
  const design = JSON.parse(localStorage.getItem('teaching-design-draft'));
  
  if (!design) {
    console.error('❌ 没有找到教学设计数据');
    console.log('💡 请先生成教学设计');
    return;
  }
  
  console.log('📋 教学设计信息:');
  console.log('  标题:', design.title);
  console.log('  ID:', design.id);
  console.log('  总页数:', design.slides.length);
  
  // 2. 检查 mediaGenerations
  console.log('\n📸 检查图片生成请求:');
  const slidesWithMedia = design.slides.filter(s => 
    s.mediaGenerations && s.mediaGenerations.length > 0
  );
  
  console.log('  包含图片生成请求的页数:', slidesWithMedia.length);
  
  if (slidesWithMedia.length === 0) {
    console.warn('⚠️  没有任何图片生成请求');
    console.log('\n💡 可能的原因:');
    console.log('  1. enableImageGeneration 没有设置为 true');
    console.log('  2. LLM 判断不需要生成图片');
    console.log('  3. 教学主题不需要配图');
    
    // 检查是否有 PDF 图片
    const slidesWithPdfImages = design.slides.filter(s => 
      s.suggestedImageIds && s.suggestedImageIds.length > 0
    );
    console.log('\n  使用 PDF 图片的页数:', slidesWithPdfImages.length);
  } else {
    slidesWithMedia.forEach((slide, i) => {
      console.log(`\n  Slide ${i + 1}: ${slide.title}`);
      slide.mediaGenerations.forEach((mg, j) => {
        console.log(`    ${j + 1}. ${mg.elementId}`);
        console.log(`       Prompt: "${mg.prompt.slice(0, 60)}..."`);
      });
    });
  }
  
  // 3. 检查媒体生成任务状态
  console.log('\n🎨 检查媒体生成任务状态:');
  
  if (typeof useMediaGenerationStore === 'undefined') {
    console.error('❌ useMediaGenerationStore 未定义');
    console.log('💡 这是正常的，因为 store 只在 React 组件中可用');
    console.log('   请在页面中查看 "🎨 图片生成进度" 区域');
  } else {
    const tasks = useMediaGenerationStore.getState().tasks;
    const taskList = Object.values(tasks);
    
    console.log('  总任务数:', taskList.length);
    
    if (taskList.length === 0) {
      console.warn('⚠️  没有任何媒体生成任务');
      console.log('\n💡 可能的原因:');
      console.log('  1. 媒体编排器没有启动');
      console.log('  2. generateMediaForOutlines 没有被调用');
      console.log('  3. 转换 TeachingSlide 到 SceneOutline 失败');
    } else {
      const pending = taskList.filter(t => t.status === 'pending');
      const generating = taskList.filter(t => t.status === 'generating');
      const done = taskList.filter(t => t.status === 'done');
      const failed = taskList.filter(t => t.status === 'failed');
      
      console.log('  ⋯ Pending:', pending.length);
      console.log('  ⏳ Generating:', generating.length);
      console.log('  ✓ Done:', done.length);
      console.log('  ✗ Failed:', failed.length);
      
      // 显示详细状态
      taskList.forEach(task => {
        const icon = task.status === 'done' ? '✓' :
                     task.status === 'generating' ? '⏳' :
                     task.status === 'failed' ? '✗' : '⋯';
        console.log(`\n  ${icon} ${task.elementId} (${task.status})`);
        if (task.status === 'done') {
          console.log(`     Object URL: ${task.objectUrl ? '✓' : '✗'}`);
        }
        if (task.status === 'failed') {
          console.log(`     Error: ${task.errorMessage}`);
        }
      });
    }
  }
  
  // 4. 检查 Canvas 中的图片元素
  console.log('\n📄 检查幻灯片 Canvas:');
  
  let totalImageElements = 0;
  let totalPlaceholders = 0;
  
  design.slides.forEach((slide, i) => {
    if (!slide.canvas || !slide.canvas.elements) {
      console.log(`  Slide ${i + 1}: 没有 canvas`);
      return;
    }
    
    const imageElements = slide.canvas.elements.filter(el => el.type === 'image');
    const placeholders = imageElements.filter(el => 
      el.src.startsWith('gen_img_') || el.src.startsWith('gen_vid_')
    );
    
    totalImageElements += imageElements.length;
    totalPlaceholders += placeholders.length;
    
    if (imageElements.length > 0) {
      console.log(`  Slide ${i + 1}: ${slide.title}`);
      console.log(`    图片元素: ${imageElements.length}`);
      console.log(`    占位符: ${placeholders.length}`);
      
      if (placeholders.length > 0) {
        placeholders.forEach(img => {
          console.log(`      - ${img.src}`);
        });
      }
    }
  });
  
  console.log(`\n  总计: ${totalImageElements} 个图片元素, ${totalPlaceholders} 个占位符`);
  
  // 5. 检查 IndexedDB
  console.log('\n💾 检查 IndexedDB 存储:');
  console.log('  正在查询...');
  
  const dbRequest = indexedDB.open('openmaic-db');
  
  dbRequest.onsuccess = function(event) {
    const db = event.target.result;
    
    if (!db.objectStoreNames.contains('mediaFiles')) {
      console.log('  ⚠️  mediaFiles 表不存在');
      return;
    }
    
    const transaction = db.transaction(['mediaFiles'], 'readonly');
    const store = transaction.objectStore('mediaFiles');
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = function() {
      const mediaFiles = getAllRequest.result;
      console.log(`  存储的媒体文件数: ${mediaFiles.length}`);
      
      if (mediaFiles.length > 0) {
        const stageId = `teaching_${design.id}`;
        const relevantFiles = mediaFiles.filter(f => f.stageId === stageId);
        
        console.log(`  当前设计相关的文件: ${relevantFiles.length}`);
        
        relevantFiles.forEach(file => {
          console.log(`    - ${file.elementId} (${(file.blob.size / 1024).toFixed(2)} KB)`);
        });
      }
    };
  };
  
  dbRequest.onerror = function() {
    console.error('  ❌ 无法打开 IndexedDB');
  };
  
  // 6. 总结和建议
  console.log('\n' + '='.repeat(60));
  console.log('📊 诊断总结');
  console.log('='.repeat(60));
  
  const hasMediaRequests = slidesWithMedia.length > 0;
  const hasPlaceholders = totalPlaceholders > 0;
  
  if (!hasMediaRequests) {
    console.log('❌ 没有图片生成请求');
    console.log('\n💡 建议:');
    console.log('  1. 确保在生成时设置了 enableImageGeneration: true');
    console.log('  2. 使用更明确需要配图的教学主题');
    console.log('  3. 检查服务器日志中的 prompt 内容');
  } else if (!hasPlaceholders) {
    console.log('⚠️  有图片生成请求，但幻灯片中没有使用占位符');
    console.log('\n💡 建议:');
    console.log('  1. 检查幻灯片生成 API 是否正常工作');
    console.log('  2. 查看 teaching-slide-generator.ts 中的 assignedImagesText');
    console.log('  3. 检查 LLM 是否理解了占位符的使用方式');
  } else {
    console.log('✅ 图片生成请求和占位符都存在');
    console.log('\n💡 下一步:');
    console.log('  1. 等待所有图片生成完成（查看页面顶部的进度条）');
    console.log('  2. 检查 IndexedDB 中是否存储了图片');
    console.log('  3. 导出 PPT 并检查图片是否正确嵌入');
    console.log('\n  如果导出的 PPT 中没有图片，请检查:');
    console.log('  - 导出时所有图片生成任务是否都完成（status: done）');
    console.log('  - use-export-teaching-pptx.ts 中的占位符解析逻辑');
    console.log('  - stageId 是否匹配（teaching_${design.id}）');
  }
  
  console.log('\n✅ 诊断完成');
})();
