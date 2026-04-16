/**
 * 教学设计图片生成流程测试脚本
 * 
 * 测试整个流程：大纲生成 → 图片生成 → 幻灯片生成
 */

async function testTeachingImageFlow() {
  console.log('🧪 开始测试教学设计图片生成流程\n');
  
  // Step 1: 测试大纲生成
  console.log('📋 Step 1: 测试大纲生成');
  console.log('  请求参数:');
  console.log('    - enableImageGeneration: true');
  console.log('    - topic: 操作系统进程调度算法（限制2页）');
  console.log('    - 模型: glm:glm-4.7\n');
  
  try {
    const outlineResponse = await fetch('http://localhost:3000/api/generate/teaching-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: {
          topic: '操作系统进程调度算法（FCFS、SJF、时间片轮转），只生成2页课件，每页都需要配图',
          subject: '计算机科学',
          gradeLevel: '大学',
          duration: 10, // 减少课时，限制页数
          language: 'zh-CN',
          enableImageGeneration: true, // 🔑 关键参数
        },
        materials: [],
        modelString: 'glm:glm-4.7',
        apiKey: 'a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        providerType: 'openai',
        requiresApiKey: true,
      })
    });
    
    if (!outlineResponse.ok) {
      const errorText = await outlineResponse.text();
      console.error('❌ 大纲生成失败');
      console.error('  状态码:', outlineResponse.status);
      console.error('  响应:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        if (error.details) {
          console.error('  详细错误:', error.details);
        }
      } catch (e) {
        // 不是 JSON 格式
      }
      return;
    }
    
    const { design } = await outlineResponse.json();
    console.log('✅ 大纲生成完成');
    console.log('  总页数:', design.slides.length);
    console.log('  设计 ID:', design.id);
    
    // 检查 mediaGenerations
    const slidesWithMedia = design.slides.filter(s => 
      s.mediaGenerations && s.mediaGenerations.length > 0
    );
    
    console.log('\n📊 图片生成请求统计:');
    console.log('  包含图片生成请求的页数:', slidesWithMedia.length);
    console.log('  总图片生成请求数:', slidesWithMedia.reduce((sum, s) => 
      sum + (s.mediaGenerations?.length || 0), 0
    ));
    
    if (slidesWithMedia.length === 0) {
      console.error('\n❌ 没有生成任何图片请求！');
      console.log('\n💡 可能的原因:');
      console.log('  1. LLM 判断不需要生成图片（教学内容不需要配图）');
      console.log('  2. enableImageGeneration 参数没有正确传递到 prompt');
      console.log('  3. Prompt 中的图片生成策略没有生效');
      console.log('  4. LLM 模型能力不足，无法理解图片生成指令');
      
      console.log('\n🔍 建议:');
      console.log('  1. 使用更明确需要配图的主题，如：');
      console.log('     "操作系统进程调度算法（需要流程图和对比图）"');
      console.log('  2. 检查服务器日志中的 prompt 内容');
      console.log('  3. 尝试使用更强大的模型（如 GPT-4）');
      
      // 显示所有幻灯片标题
      console.log('\n📄 生成的幻灯片标题:');
      design.slides.forEach((slide, i) => {
        console.log(`  ${i + 1}. ${slide.title}`);
      });
      
      return;
    }
    
    // 显示图片生成请求详情
    console.log('\n📸 图片生成请求详情:');
    slidesWithMedia.forEach((slide, i) => {
      console.log(`\n  Slide ${i + 1}: ${slide.title}`);
      slide.mediaGenerations.forEach((mg, j) => {
        console.log(`    ${j + 1}. ${mg.elementId}`);
        console.log(`       Prompt: "${mg.prompt}"`);
        console.log(`       Aspect Ratio: ${mg.aspectRatio || '16:9'}`);
      });
    });
    
    // Step 2: 测试第一个图片生成
    console.log('\n🎨 Step 2: 测试图片生成');
    const firstMedia = slidesWithMedia[0].mediaGenerations[0];
    console.log(`  测试生成: ${firstMedia.elementId}`);
    console.log(`  Prompt: "${firstMedia.prompt.slice(0, 80)}..."`);
    
    const imageStartTime = Date.now();
    const imageResponse = await fetch('http://localhost:3000/api/generate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-image-provider': 'qwen-image',
        'x-image-model': 'qwen-image-plus',
      },
      body: JSON.stringify({
        prompt: firstMedia.prompt,
        aspectRatio: firstMedia.aspectRatio || '16:9',
      })
    });
    
    const imageElapsed = ((Date.now() - imageStartTime) / 1000).toFixed(2);
    
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      console.log(`✅ 图片生成成功 (耗时: ${imageElapsed}s)`);
      console.log('  URL:', imageData.result.url);
      console.log('  尺寸:', `${imageData.result.width} × ${imageData.result.height}`);
    } else {
      const error = await imageResponse.json();
      console.error(`❌ 图片生成失败 (耗时: ${imageElapsed}s)`);
      console.error('  错误:', error);
      
      console.log('\n💡 可能的原因:');
      console.log('  1. API Key 无效或余额不足');
      console.log('  2. Prompt 包含敏感词被过滤');
      console.log('  3. 网络连接问题');
      console.log('  4. 图片生成服务暂时不可用');
    }
    
    // Step 3: 测试幻灯片生成
    console.log('\n📄 Step 3: 测试幻灯片生成');
    const testSlide = slidesWithMedia[0];
    console.log(`  测试幻灯片: ${testSlide.title}`);
    
    const slideStartTime = Date.now();
    const slideResponse = await fetch('http://localhost:3000/api/generate/teaching-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide: testSlide,
        assignedImages: [],
        imageMapping: {},
        visionEnabled: false,
        language: 'zh-CN',
        modelString: 'glm:glm-4.7',
        apiKey: 'a61159bfaa7949b98ca9863e4350217b.qZiaDB1pjuLuuADv',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        providerType: 'openai',
        requiresApiKey: true,
      })
    });
    
    const slideElapsed = ((Date.now() - slideStartTime) / 1000).toFixed(2);
    
    if (slideResponse.ok) {
      const { canvas } = await slideResponse.json();
      console.log(`✅ 幻灯片生成成功 (耗时: ${slideElapsed}s)`);
      console.log('  元素数量:', canvas.elements.length);
      
      // 检查是否使用了占位符
      const imageElements = canvas.elements.filter(el => el.type === 'image');
      const placeholderImages = imageElements.filter(el => 
        el.src.startsWith('gen_img_') || el.src.startsWith('gen_vid_')
      );
      
      console.log('  图片元素数量:', imageElements.length);
      console.log('  使用占位符的图片:', placeholderImages.length);
      
      if (placeholderImages.length > 0) {
        console.log('\n  占位符详情:');
        placeholderImages.forEach(img => {
          console.log(`    - ${img.src} (${img.width}×${img.height})`);
        });
      } else if (imageElements.length > 0) {
        console.log('\n  ⚠️  有图片元素但没有使用占位符');
        console.log('  这意味着 LLM 没有使用 mediaGenerations 中的 elementId');
      } else {
        console.log('\n  ⚠️  没有生成任何图片元素');
      }
    } else {
      const error = await slideResponse.json();
      console.error(`❌ 幻灯片生成失败 (耗时: ${slideElapsed}s)`);
      console.error('  错误:', error);
    }
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));
    console.log(`✅ 大纲生成: ${design.slides.length} 页`);
    console.log(`${slidesWithMedia.length > 0 ? '✅' : '❌'} 图片生成请求: ${slidesWithMedia.length} 页包含请求`);
    console.log(`${imageResponse.ok ? '✅' : '❌'} 图片生成 API: ${imageResponse.ok ? '成功' : '失败'}`);
    console.log(`${slideResponse.ok ? '✅' : '❌'} 幻灯片生成: ${slideResponse.ok ? '成功' : '失败'}`);
    
    if (slidesWithMedia.length > 0 && imageResponse.ok && slideResponse.ok) {
      console.log('\n🎉 所有测试通过！图片生成功能正常工作。');
      console.log('\n💡 如果在实际使用中仍然没有图片，请检查:');
      console.log('  1. 媒体编排器是否正确启动（查看浏览器 Console）');
      console.log('  2. 图片生成任务状态（useMediaGenerationStore.getState().tasks）');
      console.log('  3. IndexedDB 中是否存储了图片（Application → IndexedDB → openmaic-db）');
      console.log('  4. 导出时占位符是否被正确替换');
    } else {
      console.log('\n❌ 测试未完全通过，请根据上述错误信息排查问题。');
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    
    if (error.message.includes('fetch failed')) {
      console.error('\n💡 提示: 请确保开发服务器正在运行');
      console.error('   运行命令: cd OpenMAIC && npm run dev');
    }
  }
}

// 运行测试
testTeachingImageFlow();
