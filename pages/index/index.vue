<template><!-- index -->
	<view class="splash-container">
		<view class="header-title">welcome to Fael</view>
		<view class="header-subtitle">
			<view>seek the light within</view>
			<view>move forward on bound</view>
		</view>
		
		<view v-if="isLoading" class="loading-text">正在同步云端数据……</view>
		
		<view v-else-if="cardList.length===0" class="loading-text">
			暂无数据，点击下方按钮添加
		</view>
		
		<view class="cards-wrapper" v-else>
			<view 
				v-for="(card,index) in cardList"
				:key="card.id || index"
				class="card"
				:class="getCardClass(index)"
				@click="handleCardClick(index)"
			>
				<FaelCard :card="card" />
				
			</view>
		</view>
		<view class="btn-record" @click="handleRecordClick">记</view>
	</view>
</template>

<script setup>
	import {ref} from 'vue'
	import {onShow} from '@dcloudio/uni-app'
	import FaelCard from '@/components/FaelCard.vue'
	
	const cardList=ref([])
	
	const currentIndex=ref(0)
	const isLoading=ref(true)
	
	onShow(()=>{
		fetchDataFromCloud()
	})
	
	const fetchDataFromCloud=async()=>{
		isLoading.value=true
		try{
			const res=await uniCloud.callFunction({
				name:'getCards'
			})
			if(res.result.code===200){
				cardList.value=res.result.data
				if(currentIndex.value>=cardList.value.length){
					currentIndex.value=0
				}
			}
		}catch(e){
			uni.showToast({title:'网络请求失败',icon:'none'})
			console.error(e)
		}finally{
			isLoading.value=false
		}
	}
	
	
	const getCardClass=(index)=>{
		if(cardList.value.length===0)return ''
		const total=cardList.value.length
		
		const offset=(index-currentIndex.value+total) % total
		
		if(offset===0)return 'card-center'
		if(offset===1)return 'card-right'
		if(offset===total-1) return 'card-left'
		return 'card-hidden'
	}
	
	const handleCardClick=(index)=>{
		const total=cardList.value.length
		
		if(total===0)return
		const offset=(index-currentIndex.value+total) % total
		
		if(offset===0){
			const cardId=cardList.value[index]._id
			uni.navigateTo({
				url:`/pages/edit/edit?id=${cardId}`
			})
		}
		
		else if(offset===1 || offset===total-1){
			currentIndex.value=index
		}
	}
	
	const handleRecordClick=()=>{
		uni.navigateTo({
			url:'/pages/edit/edit'
		})
	}
</script>

<style>
	page{background-color: #ECEDEB;}
	
	.splash-container {
	  top:0;
	  left:0;
	  right:0;
	  bottom: 0;
	  display: flex;
	  flex-direction: column;
	  align-items: center;
	  position: fixed;
	  padding-top: 8vh;
	  padding-bottom: 15vh;
	  box-sizing: border-box;
	  overflow: hidden;
	}
	
	/* 顶部标题区 */
	.header-title {
	  font-size: 2.2rem;
	  color: #333;
	  letter-spacing: 2px;
	  margin-bottom: 20px;
	}
	
	.header-subtitle {
	  width: 75%;
	  text-align: right;
	  font-size: 1rem;
	  color: #666;
	  line-height: 1.5;
	  margin-bottom: 50px;
	}
	
	/* 卡片堆叠容器 */
	.cards-wrapper {
	  flex: 1;
	  position: relative;
	  width: 100vw;
	  display: flex;
	  justify-content: center;
	  align-items: center;
	  min-height: 0;
	}
	
	/* 基础卡片样式 */
	.card {
	  position: absolute;
	  width: 65vw;
	  max-width: 320px;
	  height: 100%;
	  max-height: 380px;
	  border-radius: 16px;
	  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); /* 平滑过渡动画 */
	  display: flex;
	  flex-direction: column;
	  user-select: none;
	}
	
	/* --- 卡片状态类 --- */
	/* 左侧被遮挡的卡片 */
	.card-left {
	  transform: translateX(-55%) rotate(-8deg) scale(0.9);
	  z-index: 2;
	  opacity: 0.6;
	}
	
	/* 右侧被遮挡的卡片 */
	.card-right {
	  transform: translateX(55%) rotate(8deg) scale(0.9);
	  z-index: 2;
	  opacity: 0.6;
	}
	
	/* 中间置顶的卡片 */
	.card-center {
	  transform: translateX(0) rotate(0) scale(1);
	  z-index: 3;
	  opacity: 1;
	}
	
	/* 超出范围的卡片（隐藏） */
	.card-hidden {
	  transform: translateX(0) scale(0.5);
	  z-index: 1;
	  opacity: 0;
	  pointer-events: none;
	}
	
	
	
	/* 底部按钮（纯 CSS 绘制的新拟态按钮） */
	.btn-record {
	  position: absolute;
	  bottom: calc(5vh + env(safe-area-inset-bottom,0px));
	  width: 70px;
	  height: 70px;
	  border-radius: 50%;
	  background-color: #DCE0E8;
	  box-shadow: 
	    inset 3px 3px 6px rgba(255, 255, 255, 0.9),
	    inset -3px -3px 6px rgba(0, 0, 0, 0.1),
	    3px 5px 15px rgba(0, 0, 0, 0.1);
	  display: flex;
	  justify-content: center;
	  align-items: center;
	  font-size: 1.6rem;
	  color: #555;
	  font-weight: bold;
	  transition: all 0.1s ease;
	  z-index: 10;
	}
	
	.btn-record:active {
	  box-shadow: 
	    inset 4px 4px 8px rgba(0, 0, 0, 0.15),
	    inset -2px -2px 4px rgba(255, 255, 255, 0.5);
	  transform: scale(0.96);
	}
</style>