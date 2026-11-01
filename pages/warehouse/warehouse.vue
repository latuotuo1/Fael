<template>
	<view class="warehouse-page">
		<view class="header-top">
			<view class="header-title">仓库</view>
			<view class="btn-draw" @click="handleDraw">抽</view>
		</view>
		
		
		<scroll-view scroll-y class="warehouse-list">
			<view
			  v-for="card in cardList"
			  :key="card._id"
			  class="card-item"
			  @touchstart="onTouchStart(card._id,$event)"
			  @touchmove="onTouchMove"
			  @touchend="onTouchEnd(card._id)"
			  @touchcancel="onTouchEnd(card._id)"
			  @mousedown="onTouchStart(card._id,$event)"
			  @mousemove="onTouchMove"
			  @mouseup="onTouchEnd(card._id)"
			  @mouseleave="onTouchEnd(card._id)"
			 >
				
				<view class="card-header">
					<text class="card-title">{{card.title || '未命名'}}</text>
					<view class="card-dates">
						<view>{{formatDate(card.create_time || update_time)}} </view>
							<view class="date-divider">-</view> 
							<view>{{card.tasks && card.tasks.length > 0 ?'…':formatDate(card.end_time || card.update_time) }}</view>
						</view>
				</view>
				<view class="card-footer">
					<text v-if="card.tasks && card.tasks.length > 0">未结束·共{{card.tasks.length}}条</text>
					<text v-else>已结束·共{{card.historyLogs ? card.historyLogs.length : 0}}条</text>
				</view>
			</view>
		</scroll-view>
		
		<view class="draw-mask" v-if="showDrawModal" @click="closeDrawModal">
			<view class="draw-box">
				<view class="draw-tip">{{isDrawing ? '正在从仓库去抽取…' : '点击卡片去完成'}}</view>
				<view class="draw-card-wrap" v-if="drawCard" :class="{ 'is-rolling' :isDrawing}" @click.stop="goToDrawnCard">
					<FaelCard :card="drawCard" />
				</view>
			</view>
		</view>
				
		<view class="btn-record" @click="createNewCard">记</view>
		
				<!-- 删除确认弹窗 -->
		<view class="custom-modal-mask" v-if="showDeleteModal" @click.stop="showDeleteModal = false"></view>
		<view class="custom-modal" :class="{ show: showDeleteModal }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
			<view class="modal-title">删除卡片</view>
			<view class="modal-content">确定要永久删除「{{ deleteCardTitle }}」吗？</view>
			<view class="modal-btns">
				<view class="modal-btn cancel" @click.stop="showDeleteModal = false">取消</view>
				<view class="modal-btn confirm" @click.stop="confirmDelete">删除</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {ref, onUnmounted} from 'vue'
	import {onShow} from '@dcloudio/uni-app'
	import FaelCard from '@/components/FaelCard.vue'
	
	const cardList=ref([])
	
	// --- 新增：长按删除状态 ---
	const showDeleteModal = ref(false)
	const deleteCardId = ref('')
	const deleteCardTitle = ref('')
	let pressTimer = null
	const isLongPress = ref(false)
	
	const touchStartPos=ref({x:0,y:0});
	const isMoving=ref(false);
	
	const showDrawModal=ref(false)
	const isDrawing=ref(false)
	const drawCard=ref(null)
	let drawTimer=null
	
	onShow(()=>{
		fetchData()
	})
	onUnmounted(()=>{ 
		if (drawTimer) clearInterval(drawTimer)
		if (pressTimer) clearTimeout(pressTimer)
	})
	
	const onTouchStart = (id, e) => {
			// 如果删除弹窗开着，直接拦截，不触发任何操作
			if (showDeleteModal.value) return;
	
			// 记录按下的坐标
			const point = e.touches ? e.touches[0] : e;
			touchStartPos.value = { x: point.clientX, y: point.clientY };
			isLongPress.value = false;
			isMoving.value = false;
	
			pressTimer = setTimeout(() => {
				// 只有没滑动才触发长按
				if (!isMoving.value) {
					isLongPress.value = true;
					const targetCard = cardList.value.find(c => c._id === id);
					deleteCardId.value = id;
					deleteCardTitle.value = targetCard ? targetCard.title : '未命名';
					showDeleteModal.value = true;
					if(uni.vibrateShort) uni.vibrateShort();
				}
			}, 500);
	}
	
	const onTouchMove = (e) => {
			// 如果弹窗开着，拦截
			if (showDeleteModal.value || isLongPress.value) return;
	
			const point = e.touches ? e.touches[0] : e;
			const dx = point.clientX - touchStartPos.value.x;
			const dy = point.clientY - touchStartPos.value.y;
	
			// 如果滑动距离超过 10px，说明用户是在滑动列表，而不是点击
			if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
				isMoving.value = true;
				if (pressTimer) clearTimeout(pressTimer);
			}
	}
	
	const onTouchEnd = (id) => {
			if (pressTimer) clearTimeout(pressTimer);
	
			// 如果弹窗开着，直接返回
			if (showDeleteModal.value) return;
	
			// 只有在没滑动、没长按的情况下，才算有效点击
			if (!isMoving.value && !isLongPress.value) {
				goToEdit(id);
			}
	
			// 清理状态
			setTimeout(() => {
				isLongPress.value = false;
				isMoving.value = false;
			}, 200);
	}
	
// ======= 新增：确认删除 =======
	const confirmDelete = async () => {
		showDeleteModal.value = false;
		uni.showLoading({ title: '删除中' });
		try {
			const res = await uniCloud.callFunction({
				name: 'deleteCard',
				data: { _id: deleteCardId.value }
			});
			if (res.result.code === 200) {
				uni.showToast({ title: '已删除', icon: 'none' });
				// 本地直接移除，避免重新请求，体验更顺滑
				cardList.value = cardList.value.filter(c => c._id !== deleteCardId.value);
			} else {
				uni.showToast({ title: '删除失败', icon: 'none' });
			}
		} catch (e) {
			uni.showToast({ title: '网络错误', icon: 'none' });
		} finally {
			uni.hideLoading();
		}
	}
	
	const fetchData=async()=>{
		try{
			const res=await uniCloud.callFunction({ name:'getCards' })
			if(res.result.code===200){
				cardList.value=res.result.data.map(card=>{
					if(!card.create_time){
						card.create_time=card.update_time || Date.now();
					}
					return card;
				})
			}
		}catch(e){
			uni.showToast({ title:'获取失败',icon:'none' })
		}
	}
	const formatDate=(timestamp)=>{
		if(!timestamp)return '未知'
		const timeNum=new Date(timestamp)
		
		if(isNaN(timeNum)) return '未知'
		const d=new Date(timeNum)
		if(isNaN(d.getTime())) return '未知'
		
		const year=d.getFullYear().toString().slice(2)
		const month=(d.getMonth()+1).toString().padStart(2,'0')
		const day=d.getDate().toString().padStart(2,'0')
		return `${year}.${month}.${day}`
	}
	
	const goToEdit=(id)=>{
		if(!id)return uni.showToast({
			title:'卡片Id丢失',icon:'none'
		})
		uni.navigateTo({
			url:`/pages/edit/edit?id=${id}`
		})
	}
	const createNewCard=()=>{
		uni.navigateTo({
			url:'/pages/edit/edit'
		})
	}
	
	const handleDraw=()=>{
		if(cardList.value.length === 0)return uni.showToast({title:'仓库空空如也',icon:'none'})
		showDrawModal.value=true
		isDrawing.value=true
		drawCard.value=null
		
		let count=0
		drawTimer=setInterval(()=>{
			drawCard.value=cardList.value[Math.floor(Math.random() * cardList.value.length)]
			count++
			if(count > 20){
				clearInterval(drawTimer)
				isDrawing.value=false
				drawCard.value=cardList.value[Math.floor(Math.random() * cardList.value.length)]
				if(uni.vibrateShort) uni.vibrateShort()
			}
		},100)
	}
	const closeDrawModal=()=>{
		if(!isDrawing.value)showDrawModal.value=false
	}
	const goToDrawnCard=()=>{
		if(isDrawing.value || !drawCard.value)return
		showDrawModal.value=false
		goToEdit(drawCard.value._id)
	}
</script>

<style>
	/* static/css/base.css 中请确保引入了字体 */
	.warehouse-page {
	  width: 100vw;
	  height: 100vh;
	  padding-top: var(--status-bar-height);
	  background-color: #ECEDEB;
	  display: flex;
	  flex-direction: column;
	  position: relative;
	  overflow: hidden;
	}
	.header-top{
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		margin: 20px 0;
	}
	.header-title {
	  font-size: 24px;
	  font-weight: bold;
	  text-align: center;
	  margin: 20px 0;
	  font-family: 'FaelFont', serif;
	}
	
		/* ======= 新增：删除确认弹窗样式 ======= */
		.custom-modal-mask {
	        position: fixed; top:0; left:0; right:0; bottom:0;
	        background: rgba(0, 0, 0, 0.4);
	        z-index: 200;
	        animation: fadeIn 0.2s ease;
	    }
	    .custom-modal {
	        position: fixed;
	        top: 45%; left: 50%;
	        transform: translate(-50%, -50%) scale(0.9);
	        width: 75vw; max-width: 300px;
	        background: #FDFBF7; 
	        border-radius: 16px;
	        padding: 25px 20px;
	        z-index: 201;
	        opacity: 0; pointer-events: none;
	        transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
	        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
	        font-family: 'FaelFont', serif;
	        text-align: center;
	    }
	    .custom-modal.show { opacity: 1; pointer-events: auto; transform: translate(-50%, -50%) scale(1); }
	    .modal-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 12px; }
	    .modal-content { font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 25px; }
	    .modal-btns { display: flex; justify-content: space-between; gap: 15px; }
	    .modal-btn {
	        flex: 1; padding: 12px 0; border-radius: 10px;
	        font-size: 15px; text-align: center; cursor: pointer; transition: all 0.1s;
	    }
	    .modal-btn.cancel { background-color: #E5E7EB; color: #555; }
	    .modal-btn.confirm { background-color: #E8DCC4; color: #8B5A2B; font-weight: bold; }
	    .modal-btn:active { transform: scale(0.96); }
		@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.btn-draw{
		position: absolute;
		right: 20px;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-color: #FDFBF7;
		border: 1px solid #D1D5DB;
		box-shadow: 2px 2px 0 rgba(0,0,0,0.05);
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 16px;
		font-weight: bold;
		color: #555;
		font-family: 'FaelFont',serif;
	}
	.btn-draw:active{
		background: #F4F1EA;
		transform: scale(0.95);
	}
	.warehouse-list {
	  height: calc(100vh - 80px - var(--status-bar-height));
	  padding: 0 20px;
	  box-sizing: border-box;
	  padding-bottom: 100px; /* 给底部按钮留空间 */
	}
	.warehouse-card-wrap{
		margin-bottom: 20px;
		position: relative;
	}
	.card-content{
		height: 220px;
		box-shadow: 2px 2px 0 rgba(0,0,0,0.05);
	}
	.card-item {
	  background: #FDFBF7;
	  border: 1px solid #D1D5DB;
	  border-radius: 4px;
	  padding: 15px;
	  margin-bottom: 15px;
	  display: flex;
	  flex-direction: column;
	  box-shadow: 2px 2px 0 rgba(0,0,0,0.05);
	  user-select: none;
	  -webkit-touch-callout: none;
	}
	
	.card-item:active {
	  background: #F4F1EA;
	}
	
	.card-header {
	  display: flex;
	  justify-content: space-between;
	  align-items: flex-start;
	  margin-bottom: 10px;
	}
	
	.card-title {
	  font-size: 20px;
	  font-weight: bold;
	  color: #222;
	  font-family: 'FaelFont', serif;
	  max-width: 65%;
	}
	.date-divider{
		color: #999;
		font-size: 12px;
	}
	.card-dates {
	  font-size: 13px;
	  color: #666;
	  text-align: right;
	  font-family: 'FaelFont', serif;
	}
	
	.card-footer {
	  font-size: 12px;
	  color: #888;
	  font-family: 'FaelFont', serif;
	}
	
	/* ======= 抽卡弹窗 ======= */
		.draw-mask {
		  position: fixed; top:0; left:0; right:0; bottom:0;
		  background: rgba(0, 0, 0, 0.6); z-index: 1000;
		  display: flex; justify-content: center; align-items: center;
		  backdrop-filter: blur(4px); animation: fadeIn 0.3s ease;
		}
		.draw-box { display: flex; flex-direction: column; align-items: center; width: 75vw; max-width: 320px;}
		.draw-tip { color: #FFF; font-size: 16px; font-family: 'FaelFont', serif; margin-bottom: 20px; letter-spacing: 2px; }
		
		.draw-card-wrap {
		  width: 100%; height: 380px; cursor: pointer;
		  animation: pulse 2s infinite ease-in-out;
		}
		.draw-card-wrap.is-rolling { animation: shake 0.1s infinite; }
	/* 复用底部的记按钮 */
	.btn-record {
	  position: absolute;
	  bottom: calc(6vh + env(safe-area-inset-bottom, 0px));
	  left: 50%;
	  transform: translateX(-50%);
	  width: 70px;
	  height: 70px;
	  border-radius: 50%;
	  background-color: #DCE0E8;
	  box-shadow: inset 3px 3px 6px rgba(255,255,255,0.9), inset -3px -3px 6px rgba(0,0,0,0.1), 3px 5px 15px rgba(0,0,0,0.1);
	  display: flex;
	  justify-content: center;
	  align-items: center;
	  font-size: 1.6rem;
	  color: #555;
	  font-weight: bold;
	}
	/* 动画 */
		@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
		@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
		@keyframes shake {
		  0% { transform: translate(1px, 1px) rotate(0deg); }
		  10% { transform: translate(-1px, -2px) rotate(-1deg); }
		  20% { transform: translate(-3px, 0px) rotate(1deg); }
		  30% { transform: translate(3px, 2px) rotate(0deg); }
		  40% { transform: translate(1px, -1px) rotate(1deg); }
		  50% { transform: translate(-1px, 2px) rotate(-1deg); }
		  60% { transform: translate(-3px, 1px) rotate(0deg); }
		  70% { transform: translate(3px, 1px) rotate(-1deg); }
		  80% { transform: translate(-1px, -1px) rotate(1deg); }
		  90% { transform: translate(1px, 2px) rotate(0deg); }
		  100% { transform: translate(1px, -2px) rotate(-1deg); }
		}
</style>
