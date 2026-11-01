<template><!-- CustomNav -->
  <view class="nav-bar">
    <text class="nav-btn" @click="handleBack">{{ backText }}</text>
	<slot name="title">
		<text class="nav-title">{{title}}</text>
	</slot>
    <text class="nav-btn done" @click="handleDone">{{ doneText }}</text>
  </view>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: '未命名' },
  backText: { type: String, default: 'Back' },
  doneText: { type: String, default: 'Done' }
})

const emit = defineEmits(['back', 'done'])

const handleBack = () => emit('back')
const handleDone = () => emit('done')
</script>