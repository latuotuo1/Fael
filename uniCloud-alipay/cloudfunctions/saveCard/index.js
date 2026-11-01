'use strict';//saceCard云函数
const db=uniCloud.database();
exports.main = async (event, context) => {
	const {_id,title,tasks,historyLogs,create_time,end_time}=event;
	const data={
		title,
		tasks,
		historyLogs,
		update_time:Date.now(),
		create_time,
		end_time
	};
	if(_id){
		await db.collection('fael_cards').doc(_id).update(data);
		return {code:200,msg:'更新成功'};
	}else{
		if(!data.create_time){
			data.create_time=Date.now();
		}
		const res=await db.collection('fael_cards').add(data);
		return {code:200,msg:'新增成功',id:res.id || res._id};
	}
};
