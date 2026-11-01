'use strict';//deleteCard
const db = uniCloud.database();
exports.main = async (event, context) => {
	const { _id } = event;
	if(!_id) return { code: 400, msg: '缺少ID参数' };
	try {
		await db.collection('fael_cards').doc(_id).remove();
		return { code: 200, msg: '删除成功' };
	} catch (e) {
		return { code: 500, msg: '删除失败', error: e };
	}
};