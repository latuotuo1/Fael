<template><!-- edit -->
    <view class="edit-page">
        <CustomNav @back="goBack" @done="saveData">
            <template #title>
                <input 
                  class="title-input"
                  v-model="cardTitle"
                  placeholder="未命名"
                />
            </template>
        </CustomNav>
    
		<view class="content-wrapper">
			<scroll-view scroll-y class="task-scroll-area">
				<view class="empty-tip" v-if="!tasks || tasks.length==0">点击下方输入框，新增日志</view>
				<view class="task-list" v-else>
					<view 
					  v-for="(task,index) in tasks" 
					  :key="index" 
					  class="task-item" 
					>
						<view v-if="editingIndex===index" class="task-input-wrapper">
							<input 
							  class="task-edit-input"
							  v-model="tasks[index]"
							  @blur="finishEdit"
							  @confirm="finishEdit"
							  focus
							/>
						</view>
						<view 
						  v-else 
						  class="task-display" 
						  @touchstart="onTaskTouchStart(index,$event)"
						  @touchend="onTaskTouchEnd(index)"
						  @touchcancel="onTaskTouchEnd(index)"
						  @mousedown="onTaskTouchStart(index,$event)"
						  @mouseup="onTaskTouchEnd(index)"
						  @mouseleave="onTaskTouchEnd(index)"
						>
							<text class="task-number">{{index + 1}}.</text>
							<text class="task-text">{{task}}</text>
						</view>
					</view>
				</view>
			</scroll-view>
			
			<view v-if="historyLogs && historyLogs.length > 0" class="history-container">
				<view 
				  class="history-divider" 
				  @touchstart="onHistoryTouchStart"
				  @touchend="onHistoryTouchEnd" 
				  @touchcancel="onHistoryTouchEnd"
				  @mousedown="onHistoryTouchStart" 
				  @mouseup="onHistoryTouchEnd" 
				  @mouseleave="onHistoryTouchEnd"
				>已完成</view>
				<scroll-view scroll-y class="history-scroll-area">
					<view class="history-list">
						<view 
						  v-for="(log , index) in historyLogs" 
						  :key="index" 
						  class="history-row"
						>
							<view
							  class="history-date"
							  v-if="index===0 || log.split(' ')[0] !==historyLogs[index-1].split(' ')[0]"
							>
								{{log.split(' ')[0] }}
							</view>
							<view class="history-date" v-else></view>
							<view class="history-text">
								{{ log.substring(log.indexOf(' ') + 1) }}
							</view>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
        <view 
		  class="bottom-input-area"
		  :style="{bottom: keyboardHeight > 0 ? (keyboardHeight) + 'px' : 'calc(20px + env(safe-area-inset-bottom, 0px))' }"
		>
            <input
              class="input-field"
              v-model="inputContent"
              placeholder="输入待办，发送新增"
              @confirm="handleAdd('task')"
              :adjust-position="false"
			  :cursor-spacing="0"
            />
            <text 
			  class="send-btn" 
			  @touchstart="onSendTouchStart"
			  @touchend="onSendTouchEnd"
			  @touchcancel="onSendTouchEnd"
			  @mousedown="onSendTouchStart"
			  @mouseup="onSendTouchEnd"
			  @mouseleave="onSendTouchEnd"
			>Send</text>
        </view>
		
		<!-- 新增：发送目标选择弹窗 -->
		        <view class="custom-action-mask" v-if="showSendSheet" @click="showSendSheet = false"></view>
		        <view class="custom-action-sheet" :class="{ show: showSendSheet }">
		            <view class="action-btn" @click="confirmSend('task')">发送至待办</view>
		            <view class="action-btn" @click="confirmSend('history')">发送至已完成</view>
		            <view class="action-btn cancel" @click="showSendSheet = false">取消</view>
		        </view>
		
		<view class="custom-action-mask" v-if="showSheet" @click="showSheet=false"></view>
		<view class="custom-action-sheet" :class="{show:showSheet}">
			<view class="action-btn" @click="markComplete">标记为已完成</view>
			<view class="action-btn" @click="deleteTask">删除</view>
			<view class="action-btn cancel" @click="showSheet = false">取消</view>
		</view>
		
		<view class="custom-modal-mask" v-if="showBackModal" @click="showBackModal = false"></view>
		<view class="custom-modal" :class="{show:showBackModal }">
			<view class="modal-title">	未保存的修改</view>
			<view class="modal-content">当前内容尚未保存,是否确认退出？</view>
			<view class="modal-btns">
				<view class="modal-btn cancel" @click="showBackModal=false">继续编辑</view>
				<view class="modal-btn confirm" @click="quitWithoutSave">直接退出</view>
			</view>
		</view>
		<view class="custom-toast" v-if="toastState.show" :class="{ 'is-loading' :toastState.type=== 'loading'}">
			<view v-if="toastState.type==='loading'" class="loading-spinner"></view>
			<text v-else>{{toastState.text}}</text>
		</view>
	</view>
	
	<canvas
		canvas-id="logCanvas"
		class="export-canvas"
		:style="{width: canvasWidth +'px', height: canvasHeight+ 'px'}"
	></canvas>
</template>

<script setup>
    import {ref, onUnmounted, onMounted, computed,getCurrentInstance} from 'vue'
    import {onLoad} from '@dcloudio/uni-app'
    import CustomNav from '@/components/CustomNav.vue'
    
    const cardId=ref('')
    const cardTitle=ref('')
    const tasks=ref([])
    const historyLogs=ref([])
    const inputContent=ref('')
	
	const editingIndex=ref(-1);
	const showSheet=ref(false);
	const selectedTaskIndex=ref(-1);
	const keyboardHeight=ref(0);
	const showSendSheet=ref(false);
	
	let pressTimer=null;
	const isLongPress=ref(false);
	let taskPressTimer=null;
	const isTaskLongPress=ref(false);
	const pressedTaskIndex=ref(-1);
    
	const originaDataStr=ref('');
	const showBackModal=ref(false);
	
	const createTime=ref(null);
	const endTime=ref(null);
	
	const instance=getCurrentInstance();
	const canvasWidth=ref(600);
	const canvasHeight=ref(800);
	
	const getGroupedLogs=()=>{
		const groups={};
		historyLogs.value.forEach(log=>{
			const spaceIndex=log.indexOf(' ');
			const date=log.substring(0, spaceIndex);
			const text=log.substring(spaceIndex + 1);
			if(!groups[date])groups[date] = [];
			groups[date].push(text);
		});
		return Object.keys(groups).sort((a, b)=> b.localeCompare(a)).map(date=>({
			date,
			tasks:groups[date]
		}));
	};
	
	    // --- 长按模拟逻辑（兼容浏览器） ---
	    let historyPressTimer = null;
	    const onHistoryTouchStart = (e) => {
	        if (e && e.preventDefault) e.preventDefault();
	        historyPressTimer = setTimeout(() => {
	            exportLogImage();
	        }, 600);
	    }
	    const onHistoryTouchEnd = () => {
	        if (historyPressTimer) clearTimeout(historyPressTimer);
	    }
	    // 记得在 onUnmounted 里加上：if (historyPressTimer) clearTimeout(historyPressTimer);
	
	// 导出日志的主函数
	        const exportLogImage = () => {
	            if (!historyLogs.value || historyLogs.value.length === 0) {
	                return uni.showToast({ title: '暂无日志可导出', icon: 'none' });
	            }
	    
	            uni.showLoading({ title: '正在生成图片...' });
	            const groupedLogs = getGroupedLogs();
	            
	            // 1. 基础排版参数（干脆给个足够大的画布，最后再裁剪，最稳妥）
	            const canvasWidth = 600;
	            const paddingX = 40; 
	            let currentY = 100; // 初始高度
	            const lineHeight = 26; // 行高
				const itemGap=12;
	            const timeAxisX = paddingX + 60; // 时间轴 X 坐标
	            const textStartX = timeAxisX + 30; // 文字起始 X 坐标
	            const maxTextWidth = canvasWidth - textStartX - paddingX; 
	    
	            // 🌟 把 canvasHeight 设大一点，足够放下所有内容
	            canvasHeight.value = 3000;
	    
	            // 延迟一下，等画布尺寸变成 3000 后再开始画
	            setTimeout(() => {
	                const ctx = uni.createCanvasContext('logCanvas', instance.proxy);
	                
	                // 2. 画背景
	                ctx.setFillStyle('#F9F6EF');
	                ctx.fillRect(0, 0, canvasWidth, canvasHeight.value);
	    
	                // 3. 画标题
	                ctx.setFillStyle('#222222');
	                ctx.setFontSize(32);
	                ctx.setTextAlign('center');
	                ctx.fillText(cardTitle.value || '未命名', canvasWidth / 2, 60);
	    
	                // 4. 画起止日期
	                ctx.setFillStyle('#666666');
	                ctx.setFontSize(16);
	                const start = formatDate(createTime.value || Date.now());
	                const end = endTime.value ? formatDate(endTime.value) : '至今';
	                ctx.fillText(`${start} - ${end}`, canvasWidth / 2, 100);
	    
	                // 5. 画分隔线
	                ctx.beginPath();
	                ctx.setStrokeStyle('#D1D5DB');
	                ctx.moveTo(paddingX, 130);
	                ctx.lineTo(canvasWidth - paddingX, 130);
	                ctx.stroke();
	    
	                // 6. 开始绘制时间轴和任务
	                currentY = 180; // 正式内容的起点
	                ctx.setTextAlign('left'); 
	    
	                groupedLogs.forEach((group) => {
	                    // 画日期
	                    ctx.setFillStyle('#999999');
	                    ctx.setFontSize(16);
	                    ctx.fillText(group.date, paddingX, currentY);
	    
	                    // 画节点圆点
	                    ctx.beginPath();
	                    ctx.setFillStyle('#D1D5DB');
	                    ctx.arc(timeAxisX, currentY - 6, 5, 0, Math.PI * 2);
	                    ctx.fill();
	    
	                    let groupStartY = currentY;
	                    currentY += lineHeight;
	    
	                    // 画当天的任务
	                    group.tasks.forEach(task => {
	                        ctx.setFillStyle('#333333');
	                        ctx.setFontSize(16);
	                        
	                        let line = '';
	                        let isFirstLine = true; 
	                        const wrapIndent = 25; // 🌟 加大到 35px，向左偏移非常明显！
	    
	                        for (let i = 0; i < task.length; i++) {
	                            if (ctx.measureText(line + task[i]).width > maxTextWidth) {
	                                // 🌟 如果是第一行，X 是 textStartX；如果换行了，就向左偏 35px
	                                let drawX = isFirstLine ? textStartX : (textStartX - wrapIndent);
	                                ctx.fillText(line, drawX, currentY);
	                                
	                                line = task[i];
	                                currentY += lineHeight;
	                                isFirstLine = false; // 换行后标记取消
	                            } else {
	                                line += task[i];
	                            }
	                        }
	                        // 绘制最后一行残留文字
	                        if (line) {
	                            let drawX = isFirstLine ? textStartX : (textStartX - wrapIndent);
	                            ctx.fillText(line, drawX, currentY);
	                            currentY += lineHeight;
	                        }
							currentY += itemGap;
	                    });
	    
	                    // 画时间轴的灰色连接线
	                    ctx.beginPath();
	                    ctx.setStrokeStyle('#E5E7EB');
	                    ctx.setLineWidth(2);
	                    ctx.moveTo(timeAxisX, groupStartY);
	                    ctx.lineTo(timeAxisX, currentY - 20);
	                    ctx.stroke();
	    
	                    currentY += 30; // 组与组之间的距离
	                });
	    
	                // 7. 画完后，用 currentY 拿到实际的总高度，精准裁剪
	                const finalHeight = currentY + 50;
	    
	                ctx.draw(false, () => {
	                    setTimeout(() => {
	                        uni.canvasToTempFilePath({
	                            canvasId: 'logCanvas',
	                            x: 0, 
	                            y: 0,
	                            width: canvasWidth,
	                            height: finalHeight, // 只截取有内容的部分
	                            destWidth: canvasWidth * 2, 
	                            destHeight: finalHeight * 2, 
	                            success: (res) => {
	                                uni.hideLoading();
	                                uni.previewImage({
	                                    urls: [res.tempFilePath],
	                                    current: res.tempFilePath
	                                });
	                            },
	                            fail: (err) => {
	                                uni.hideLoading();
	                                uni.showToast({ title: '生成失败', icon: 'none' });
	                            }
	                        }, instance.proxy);
	                    }, 200); 
	                });
	            }, 100); 
	        }
	
	const toastState=ref({
		show:false,
		type:'text',
		text:''
	})
	
	const showCustomToast=(text,type='text',duration=1500)=>{
		toastState.value={show:true,type,text};
		if(type === 'text'){
			setTimeout(()=>{ toastState.value.show = false;}, duration);
		}
	};
	
	const generateSnapshot=()=>{
		return JSON.stringify({
			title:cardTitle.value,
			tasks:tasks.value,
			historyLogs:historyLogs.value
		});
	};
	
	const hasChanges=computed(()=>{
		return generateSnapshot() !== originaDataStr.value;
	});
	
    onLoad((options)=>{
		createTime.value=Date.now();
        if(options.id){
            cardId.value=options.id
            fetchDetail()
        }else{
			originaDataStr.value=generateSnapshot();
		}
    })
    
    const fetchDetail=async()=>{
        uni.showLoading({title:'加载中'})
        try{
            const res=await uniCloud.callFunction({
                name:'getCards',
                data:{_id:cardId.value}
            })
            if(res.result.code===200 && res.result.data){
                const data=res.result.data
                cardTitle.value=data.title
                tasks.value=data.tasks || []
                historyLogs.value=data.historyLogs || []
				
				createTime.value=data.create_time || data.update_time || Date.now();
				endTime.value=data.end_time || null;
				
				originaDataStr.value=generateSnapshot();
            }
        }catch(e){
            uni.showToast({
                title:'加载失败',
                icon:'none'
            })
        }finally{
            uni.hideLoading()
        }
    }
	
	const goBack=()=>{
		if(hasChanges.value){
			showBackModal.value=true;
		}else{
			navigateBack();
		}
	}
	const quitWithoutSave=()=>{
		showBackModal.value=false;
		navigateBack();
	}
	
	const navigateBack=()=>{
	    uni.navigateTo({
	        url:'/pages/warehouse/warehouse'
	    })
	}
	
	const onTaskTouchStart=(index,e)=>{
		if(e && e.preventDefault)e.preventDefault();
		pressedTaskIndex.value=index;
		isTaskLongPress.value=false;
		
		taskPressTimer=setTimeout(()=>{
			isTaskLongPress.value=true;
			showActionSheet(index);
			if(uni.vibrateShort) uni.vibrateShort();
		},500);
	}
	const onTaskTouchEnd=(index)=>{
		if(taskPressTimer) clearTimeout(taskPressTimer);
		
		if(!isTaskLongPress.value && pressedTaskIndex.value === index){
			startEdit(index);
		}
		pressedTaskIndex.value=-1;
	}
	
	const onSendTouchStart=(e)=>{
		if(e && e.preventDefault) e.preventDefault();
		isLongPress.value=false;
		pressTimer=setTimeout(()=>{
			isLongPress.value=true;
			showSendSheet.value=true;
			if(uni.vibrateShort) uni.vibrateShort();
		}, 500);
	};
	const onSendTouchEnd=()=>{
		if(pressTimer)clearTimeout(pressTimer);
		if(!isLongPress.value){
			handleAdd('task');
		}
	}
	const confirmSend=(type)=>{
		showSendSheet.value=false;
		handleAdd(type);
	};
	
	
	const handleKeyboardChange=(res)=>{
		keyboardHeight.value=res.height || 0;
	}
	
	onMounted(() => {
	    // 判断当前运行环境
	    // #ifdef H5
	    // H5 专用：通过监听窗口大小变化来模拟键盘高度
	    let originalHeight = window.innerHeight;
	    window.addEventListener('resize', () => {
	        const currentHeight = window.innerHeight;
	        // 如果窗口高度变小了，说明键盘弹起了
	        if (originalHeight - currentHeight > 100) { 
	            keyboardHeight.value = originalHeight - currentHeight;
	        } else {
	            keyboardHeight.value = 0; // 键盘收起
	        }
	    });
	    // #endif
	
	    // #ifndef H5
	    // App/小程序 环境：使用原生 API
	    if (typeof uni.onKeyboardHeightChange === 'function') {
	        uni.onKeyboardHeightChange(handleKeyboardChange);
	    }
	    // #endif
	});
	
	onUnmounted(()=>{
		if(typeof uni.offKeyboardHeightChange === 'function'){
			uni.offKeyboardHeightChange(handleKeyboardChange);
		}
		if (historyPressTimer) clearTimeout(historyPressTimer);
	});
    
    
    
    const handleAdd=(type='task')=>{
        const text=inputContent.value.trim()
        if(!text) return;
		
		if(type==='task'){
			tasks.value.push(text);
		}else if(type==='history'){
			const dateStr=formatDate(new Date());
			historyLogs.value.unshift(`${dateStr} ${text}` );
		}
        inputContent.value='';
    };
    
    const startEdit=(index)=>{
		editingIndex.value=index;
	}
	const finishEdit=()=>{
		editingIndex.value=-1;
	}
    
    const showActionSheet=(index)=>{
        selectedTaskIndex.value=index;
		showSheet.value=true;
    }
    
	const markComplete=()=>{
		const index=selectedTaskIndex.value;
		if(index>-1){
			const taskText=tasks.value[index];
			const dateStr=formatDate(new Date());
			historyLogs.value.unshift(`${dateStr} ${taskText}`);
			tasks.value.splice(index,1);
		}
		showSheet.value=false;
	}
	
	const deleteTask=()=>{
		const index=selectedTaskIndex.value;
		if(index> -1){
			tasks.value.splice(index,1);
		}
		showSheet.value=false;
	}
	
    const formatDate=(time)=>{
		if(!time) return '未知';
		const d=new Date(time);
		if(isNaN(d.getTime())) return '未知';
        const month=(d.getMonth() + 1).toString().padStart(2,'0')
        const day=d.getDate().toString().padStart(2,'0')
        return `${month}.${day}`
    }
    
    const saveData=async()=>{
        if(!cardTitle.value.trim() && tasks.value.length===0 && historyLogs.value.length===0){
            return showCustomToast('请输入内容');
        }
		
        showCustomToast('保存中','loading');
		
		if(tasks.value.length === 0 && historyLogs.value.length > 0){
			if(!endTime.value) endTime.value = Dat.now();
		}else{
			endTime.value=null;
		}
        
        try{            
            const res=await uniCloud.callFunction({
                name:'saveCard',
                data:{
                    _id:cardId.value,
                    title:cardTitle.value.trim() || '未命名',
                    tasks:tasks.value,
                    historyLogs:historyLogs.value,
					create_time:createTime.value,
					end_time:endTime.value,
					update_time:Date.now()
                }
            })
            
            if(res.result.code===200){
				showCustomToast('保存成功');
                if(!cardId.value && res.result.id){
                    cardId.value=res.result.id
                }
				originaDataStr.value=generateSnapshot();
            }else{
				showCustomToast('保存失败');
			}
        }catch(e){
				showCustomToast('网络错误，保存失败');
            }
    }
	
	
</script>

<style>
    /* 页面容器与网格背景 */
    .edit-page {
	  position: absolute;
      width: 100vw;
      height: 100vh;
      padding-top: var(--status-bar-height);
      background-color: var(--bg-cream);
      background-image: 
        linear-gradient(to right, var(--line-color) 1px, transparent 1px),
        linear-gradient(to bottom, var(--line-color) 1px, transparent 1px);
      background-size: 20px 20px; 
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
    }
    
    /* 提示文字 */
    .empty-tip {
      position: absolute;
      top:50%;
      left:50%;
      transform: translate(-50%,-50%);
      text-align: center;
      color: var(--text-muted);
      width: 100%;
      margin-top: 80px;
      font-size: 15px;
      font-family: 'FaelFont', serif;
      letter-spacing: 1px;
    }
    
    /* 中间内容区 */
    .content-wrapper {
      flex: 1;
	  display: flex;
	  flex-direction: column;
      overflow-y: hidden;
      /* padding: 0 10px; */
      padding-bottom: 120px; /* 给底部输入框留出空间 */
	  box-sizing: border-box;
    }
    
    /* 底部输入框区域 */
    .bottom-input-area {
      position: fixed;
      bottom: calc(20px + env(safe-area-inset-bottom, 0px)); /* 适配刘海屏 */
      left: 20px;
      right: 20px;
      height: 50px;
      background-color: var(--btn-bg);
      border-radius: 25px;
      display: flex;
      align-items: center;
      padding: 0 10px 0 20px;
      box-sizing: border-box;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
      z-index: 10;
    }
    
    .input-field {
      flex:1;
      font-size: 15px;
      color: var(--text-dark);
      font-family: 'FaelFont', serif;
    }
    .send-btn{
        padding: 8px 15px;
        font-size: 14px;
        color: #888;
        cursor: pointer;
        font-family: 'FaelFont',serif;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
    }
    .send-btn:active{
        color: var(--text-dark);
    }
    /* 待办列表 */
    .task-list { 
	  padding-top: 20px; 
	  flex: 1;
	  padding: 0 20px;
	  box-sizing: border-box;
	  padding-bottom: 80px;
	}
    .task-item {
      font-size: 18px;
      color: var(--text-dark);
      margin-bottom: 15px;
      line-height: 1.5;
      font-family: 'FaelFont', serif;
    }
	.task-display{
		display: flex;
		align-items: flex-start;
		width: 100%;
		user-select: none;           /* 核心：禁止选中 */
		-webkit-user-select: none;   
	    -webkit-touch-callout: none; /* 核心：禁止系统弹窗 */
	}
	.task-number{
		width: 30px;
		flex-shrink: 0;
	}
	.task-text{
		flex: 1;
		word-break: break-all;
	}
	.task-input-wrapper{
		width: 100%;
		display: flex;
		padding-bottom: 5px;
		border-bottom: 1px dashed #D1D5DB;
	}
	.task-edit-input{
		flex: 1;
		font-size: 16px;
		font-family: 'FaelFont', serif;
		color: var(--text-dark);
	}
	.task-scroll-area{
		flex: 1;
		height: 0;
		overflow-y: auto;
	}
    
    /* 已完成区域 (P3 的分割线) */
    .history-divider {
      display: flex;
      align-items: center;
      color: #AAA;
      font-size: 14px;
      margin: 40px 10px 20px;
      font-family: 'FaelFont', serif;
    }
    .history-divider::before,
    .history-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #D1D5DB;
    }
    .history-divider::before { margin-right: 15px; }
    .history-divider::after { margin-left: 15px; }
    .history-row{
        display: flex;
        margin-bottom: 18px;
        font-family: 'FaelFont', serif;
        font-size: 15px;
        line-height: 1.4;
    }
	.history-list{
		flex: 1;
		color: #555;
		padding: 0 20px;
	}
    
    .history-date{
        width:65px;
        color: #AAA;
        flex-shrink: 0;
    }
    /* 已完成日志列表 */
    .history-group {
      margin-bottom: 20px; /* 底部留空给输入框 */
    }
    .history-text{
        flex: 1;
        color: #555;
		padding-top: 4px;
		word-break: break-all;
    }
	/* 2. 已完成区：固定在下方，比如占屏幕高度的 35% */
	.history-container {
	    height: 25vh; /* 你可以根据喜好调整这个高度 */
	    display: flex;
	    flex-direction: column;
	    flex-shrink: 0; 
	    border-top: 1px solid rgba(0,0,0,0.02); 
	}
	
	/* 已完成的滑动区 */
	.history-scroll-area {
	    flex: 1;
	    height: 0; 
	    overflow-y: auto;
	}
    
    /* 占位符样式 */
    .input-field ::placeholder {
      color: var(--text-muted);
      text-align: center;
    }
    
    .title-input {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
      font-family: 'FaelFont', serif;
    }
    .custom-action-mask{
        position: fixed; 
        top:0; 
        left: 0; 
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 99;
    }
    .custom-action-sheet {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: var(--bg-cream);
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      padding: 20px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      z-index: 100;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      font-family: 'FaelFont', serif;
    }
    .custom-action-sheet.show { transform: translateY(0); }
.action-btn {
  text-align: center; padding: 15px 0; font-size: 16px;
  color: var(--text-dark); border-bottom: 1px solid rgba(0,0,0,0.05);
}
.action-btn.cancel { border-bottom: none; margin-top: 10px; color: var(--text-muted); }

    /* ========== 新增：居中确认弹窗 ========== */
    .custom-modal-mask {
        position: fixed; top:0; left:0; right:0; bottom:0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 200;
        /* 增加淡入淡出动画 */
        animation: fadeIn 0.2s ease;
    }
    
    .custom-modal {
        position: fixed;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        width: 75vw;
        max-width: 300px;
        background: var(--bg-cream);
        border-radius: 16px;
        padding: 25px 20px;
        z-index: 201;
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        font-family: 'FaelFont', serif;
        text-align: center;
    }
    
    .custom-modal.show {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%) scale(1);
    }
    
    .modal-title {
        font-size: 18px;
        font-weight: bold;
        color: var(--text-dark);
        margin-bottom: 12px;
    }
    
    .modal-content {
        font-size: 14px;
        color: #666;
        line-height: 1.5;
        margin-bottom: 25px;
    }
    
    .modal-btns {
        display: flex;
        justify-content: space-between;
        gap: 15px;
    }
    
    .modal-btn {
        flex: 1;
        padding: 12px 0;
        border-radius: 10px;
        font-size: 15px;
        text-align: center;
        cursor: pointer;
        transition: all 0.1s;
    }
    
    .modal-btn.cancel {
        background-color: var(--btn-bg);
        color: #555;
    }
    
    .modal-btn.confirm {
        background-color: #E8DCC4; /* 用一个偏暖的警示色 */
        color: #8B5A2B;
        font-weight: bold;
    }
    
    .modal-btn:active { transform: scale(0.96); }

    /* ========== 新增：自定义 Toast / Loading ========== */
    .custom-toast {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.75);
        color: #FFF;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 14px;
        z-index: 999;
        font-family: 'FaelFont', serif;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: fadeIn 0.2s ease;
    }

    .custom-toast.is-loading {
        flex-direction: column;
        padding: 20px;
    }

    /* 简单的 CSS 旋转 Loading 动画 */
    .loading-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: #FFF;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 10px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
	
		/* 隐藏导出画布 */
		.export-canvas {
			position: fixed;
			left: -9999px;
			top: -9999px;
			z-index: -1;
		}
</style>