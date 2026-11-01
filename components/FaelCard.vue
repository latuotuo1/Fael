<template><!-- FaelCard -->
	<view class="fael-card">
		<view class="card-title">{{ card.title || '未命名' }}</view>
		<view class="card-divider"></view>
		
		<scroll-view scroll-y class="tasks-list" v-if="card.tasks && card.tasks.length > 0">
			<view v-for="(task, i) in card.tasks" :key="i" class="task-item">
				<view class="task-num">{{ i + 1 }}.</view>
				<view class="task-text">{{ task }}</view>
			</view>
		</scroll-view>
		<view class="tasks-list empty-tasks" v-else>暂无待办</view>
		
		<view class="history-section" v-if="card.historyLogs && card.historyLogs.length > 0">
			<view class="card-divider"></view>
			<scroll-view scroll-y class="history-scroll-box">
				<view v-for="(log, i) in card.historyLogs" :key="i" class="history-row">
					<view 
					  class="history-date"
					  v-if="i === 0 || log.split(' ')[0] !== card.historyLogs[i - 1].split(' ')[0]"
					>
						{{ log.split(' ')[0] }}
					</view>
					<view class="history-date" v-else></view>
					<view class="history-text">{{ log.substring(log.indexOf(' ') + 1) }}</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
	// 接收父组件传来的卡片数据
	defineProps({
		card: {
			type: Object,
			required: true
		}
	})
</script>

<style scoped>
	/* 基础卡片外观 */
	.fael-card {
		width: 100%;
		height: 100%;
		background-color: #F9F6EF;
		border-radius: 16px;
		padding: 20px;
		box-sizing: border-box;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
		display: flex;
		flex-direction: column;
		user-select: none;
		font-family: 'FaelFont', serif;
	}
	
	.card-title {
		font-size: 1.4rem;
		text-align: center;
		margin-bottom: 10px;
		font-weight: bold;
		color: #222;
	}
	
	.card-divider {
		width: 100%;
		height: 1px;
		background-color: #333;
		margin: 10px 0;
		opacity: 0.3;
		flex-shrink: 0;
	}
	
	.tasks-list {
		flex: 1;
		overflow-y: auto;
		margin-bottom: 5px;
		min-height: 0;
	}
	.empty-tasks {
		display: flex;
		justify-content: center;
		align-items: center;
		color: #999;
		font-size: 0.9rem;
	}
	.task-item {
		display: flex;
		align-items: flex-start;
		width: 100%;
		font-size: 0.9rem;
		color: #333;
		line-height: 1.5;
		margin-top: 6px;
	}
	.task-num {
		width: 22px;
		flex-shrink: 0;
		text-align: left;
	}
	.task-text {
		flex: 1;
		min-width: 0;
		word-break: break-all;
		text-align: left;
	}
	
	.history-section {
		height: 90px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
	}
	.history-scroll-box {
		flex: 1;
		overflow-y: auto;
		padding-right: 5px;
		min-height: 0;
	}
	.history-row {
		display: flex;
		align-items: flex-start;
		font-size: 0.8rem;
		color: #666;
		line-height: 1.4;
		margin-top: 6px;
	}
	.history-date {
		width: 52px;
		flex-shrink: 0;
		color: #999;
	}
	.history-text {
		flex: 1;
		min-width: 0;
		word-break: break-all;
		text-align: left;
	}
	
	/* 隐藏滚动条 */
	::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}
</style>