'use strict';//getCards云函数
const db=uniCloud.database();
exports.main = async (event, context) => {
	const {_id}=event;
	if(_id){
		const res=await db.collection('fael_cards').doc(_id).get();
		const data=Array.isArray(res.data) ? res.data[0] : res.data;
		
		if(!data){
			return {code:404,msg:'卡片不存在'};
		}
		return{code:200,data};
	}
	const res=await db.collection('fael_cards').orderBy('update_time','desc').get();
	return{code:200,data:res.data};
};
