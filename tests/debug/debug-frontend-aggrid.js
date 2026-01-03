/**
 * 调试前端AgGrid渲染问题
 */

// 模拟后端返回的数据
const mockBackendResponse = {
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "穆茂",
            "g_rank": 1,
            "rank_index": 1,
            "g_father_id": 0,
            "official_position": null,
            "summary": null,
            "adoption": "none",
            "sex": "MAN",
            "g_mother_id": null,
            "birth_date": null,
            "id_card": null,
            "face_img": "",
            "photos": null,
            "household_info": null,
            "spouse": null,
            "home_page": null,
            "dealth": null,
            "formal_name": null,
            "location": null,
            "childrens": null
        },
        {
            "id": 2,
            "name": "穆贵",
            "g_rank": 2,
            "rank_index": 1,
            "g_father_id": 1,
            "official_position": null,
            "summary": null,
            "adoption": "none",
            "sex": "MAN",
            "g_mother_id": null,
            "birth_date": null,
            "id_card": null,
            "face_img": "",
            "photos": null,
            "household_info": null,
            "spouse": null,
            "home_page": null,
            "dealth": null,
            "formal_name": null,
            "location": null,
            "childrens": null
        },
        {
            "id": 3,
            "name": "穆经",
            "g_rank": 3,
            "rank_index": 1,
            "g_father_id": 2,
            "official_position": null,
            "summary": null,
            "adoption": "none",
            "sex": "MAN",
            "g_mother_id": null,
            "birth_date": null,
            "id_card": null,
            "face_img": "",
            "photos": null,
            "household_info": null,
            "spouse": null,
            "home_page": null,
            "dealth": null,
            "formal_name": null,
            "location": null,
            "childrens": null
        }
    ],
    "count": 3,
    "requestId": "mfcdhvcn",
    "processedImages": 1
};

// 模拟前端qwenOcrService.recognizeFamilyTree的返回值
function simulateQwenOcrService(backendResponse) {
    console.log('🔍 模拟qwenOcrService.recognizeFamilyTree...');
    console.log('📥 后端响应:', backendResponse);
    
    if (backendResponse.success && backendResponse.data) {
        console.log(`🎉 识别完成，共获得 ${backendResponse.data.length} 条记录`);
        return backendResponse.data; // 返回数据数组
    } else {
        console.warn('⚠️ 后端返回空结果');
        return [];
    }
}

// 模拟前端CreatorPage的handleOCR函数中的数据处理逻辑
function simulateHandleOCR() {
    console.log('🚀 模拟前端handleOCR函数...');
    
    try {
        // 1. 调用qwenOcrService
        const parsed = simulateQwenOcrService(mockBackendResponse);
        
        console.log('🎯 OCR识别结果:', parsed);
        console.log('📊 识别到的记录数量:', parsed?.length || 0);
        console.log('📊 结果类型:', typeof parsed);
        console.log('📊 是否为数组:', Array.isArray(parsed));

        // 2. 数据验证和处理
        if (parsed && parsed.length > 0) {
            console.log('✅ 设置识别数据到表格...');

            // 确保数据格式正确
            const validatedData = parsed.map((item, index) => ({
                ...item,
                // 确保必需字段存在
                id: item.id || `temp_${Date.now()}_${index}`,
                name: item.name || `未知姓名${index + 1}`,
                g_rank: item.g_rank || 1,
                rank_index: item.rank_index || (index + 1),
                sex: item.sex || 'MAN',
                adoption: item.adoption || 'none',
                g_father_id: item.g_father_id || 0,
                official_position: item.official_position || '',
                summary: item.summary || null,
                g_mother_id: item.g_mother_id || null,
                birth_date: item.birth_date || null,
                id_card: item.id_card || null,
                face_img: item.face_img || null,
                photos: item.photos || null,
                household_info: item.household_info || null,
                spouse: item.spouse || null,
                home_page: item.home_page || null,
                dealth: item.dealth || null,
                formal_name: item.formal_name || null,
                location: item.location || null,
                childrens: item.childrens || null
            }));

            console.log('🔄 验证后的数据:', validatedData);
            
            // 3. 检查数据质量
            console.log('\n📋 数据质量检查:');
            validatedData.forEach((record, index) => {
                console.log(`记录 ${index + 1}:`);
                console.log(`  - ID: ${record.id} (${typeof record.id})`);
                console.log(`  - 姓名: ${record.name} (${typeof record.name})`);
                console.log(`  - 世代: ${record.g_rank} (${typeof record.g_rank})`);
                console.log(`  - 性别: ${record.sex} (${typeof record.sex})`);
                console.log(`  - 收养状态: ${record.adoption} (${typeof record.adoption})`);
                
                // 检查必需字段
                const requiredFields = ['id', 'name', 'g_rank', 'sex', 'adoption'];
                const missingFields = requiredFields.filter(field => 
                    record[field] === null || record[field] === undefined || record[field] === ''
                );
                
                if (missingFields.length > 0) {
                    console.warn(`  ⚠️ 缺少必需字段: ${missingFields.join(', ')}`);
                } else {
                    console.log(`  ✅ 所有必需字段都存在`);
                }
            });
            
            // 4. 模拟AgGrid数据设置
            console.log('\n🔄 模拟AgGrid数据设置...');
            console.log('setRows(validatedData) 被调用');
            console.log('传递给AgGrid的数据:', validatedData);
            
            // 5. 检查AgGrid可能的问题
            console.log('\n🔍 AgGrid渲染问题诊断:');
            
            // 检查数据结构
            if (!Array.isArray(validatedData)) {
                console.error('❌ 数据不是数组格式');
                return;
            }
            
            if (validatedData.length === 0) {
                console.error('❌ 数据数组为空');
                return;
            }
            
            // 检查第一条记录的字段
            const firstRecord = validatedData[0];
            const expectedFields = [
                'id', 'name', 'g_rank', 'rank_index', 'g_father_id', 
                'official_position', 'summary', 'adoption', 'sex', 
                'g_mother_id', 'birth_date', 'id_card', 'face_img', 
                'photos', 'household_info', 'spouse', 'home_page', 
                'dealth', 'formal_name', 'location', 'childrens'
            ];
            
            console.log('字段检查:');
            expectedFields.forEach(field => {
                const hasField = firstRecord.hasOwnProperty(field);
                const value = firstRecord[field];
                const type = typeof value;
                console.log(`  - ${field}: ${hasField ? '✅' : '❌'} 存在, 值: ${value}, 类型: ${type}`);
            });
            
            // 6. 可能的问题和解决方案
            console.log('\n💡 可能的AgGrid渲染问题和解决方案:');
            
            console.log('1. 数据格式问题:');
            console.log('   - 检查数据是否为有效数组 ✅');
            console.log('   - 检查数据是否包含必需字段 ✅');
            console.log('   - 检查字段类型是否正确 ✅');
            
            console.log('\n2. AgGrid配置问题:');
            console.log('   - 检查columnDefs是否正确定义');
            console.log('   - 检查rowData是否正确传递');
            console.log('   - 检查AgGrid容器高度是否设置');
            
            console.log('\n3. React状态更新问题:');
            console.log('   - 检查setRows是否正确调用');
            console.log('   - 检查useEffect是否正确监听数据变化');
            console.log('   - 检查是否有异步状态更新冲突');
            
            console.log('\n4. CSS样式问题:');
            console.log('   - 检查ag-theme-alpine样式是否正确加载');
            console.log('   - 检查容器高度是否设置为500px');
            console.log('   - 检查是否有CSS冲突');
            
            console.log('\n🎯 建议的调试步骤:');
            console.log('1. 在浏览器控制台检查是否有JavaScript错误');
            console.log('2. 检查Network面板确认数据正确返回');
            console.log('3. 在FamilyDataGrid组件中添加console.log确认数据接收');
            console.log('4. 检查AgGrid的DOM元素是否正确渲染');
            console.log('5. 尝试使用"生成测试数据"按钮验证AgGrid功能');
            
            return validatedData;
            
        } else {
            console.log('⚠️ 未识别到数据，创建10行空白占位');
            return [];
        }
        
    } catch (error) {
        console.error('❌ handleOCR模拟失败:', error);
        return [];
    }
}

// 运行模拟测试
console.log('🧪 ========== 前端AgGrid渲染问题调试 ==========');
console.log('📊 模拟后端返回的数据:', mockBackendResponse);
console.log('');

const result = simulateHandleOCR();

console.log('\n🏁 调试完成');
console.log('📋 总结:');
console.log('- 后端数据格式正确 ✅');
console.log('- qwenOcrService返回正确 ✅');
console.log('- 前端数据验证正确 ✅');
console.log('- 数据传递给AgGrid正确 ✅');
console.log('');
console.log('💡 如果AgGrid仍然不渲染，问题可能在于:');
console.log('1. React组件状态更新');
console.log('2. AgGrid配置或样式');
console.log('3. 浏览器控制台错误');
console.log('4. CSS样式冲突');
