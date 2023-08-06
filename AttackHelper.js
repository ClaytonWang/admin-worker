'use strict';

import AttackNumber from './AttackNumber';
import redis from './db/redis';
import CONSTANTS from './constants';
import REDIS from './constants/redis';
import query from './db/mysql';

const { ADMIN_PREFIX, JSESSION_EXPIRE_TIME } = REDIS;
const { FILERPARAMS } = CONSTANTS;
class AttackHelper {
  constructor(token) {
    this.token = token;
    this.sessionId = '';
    this.redisKey = '';
    this.attacker = null;
    this.redisKey = ADMIN_PREFIX + token;
    this.logHandler = null;
  }

  async init(logger) {
    this.attacker = new AttackNumber(this.token);
    this.logHandler = logger;
  }

  async prepareQuery(force = false) {
    this.sessionId = await this.getKey(this.redisKey);
    // 第一次或10分钟后重新认证一下
    if (!this.sessionId || force) {
      // 第一次302跳转页面
      this.sessionId = await this.attacker.getPage();
      this.logHandler.log('【第一次302跳转页面】：完成');

      // 超时,自动 重新拿JSESSIONID
      this.sessionId = await this.attacker.sendLocation(this.sessionId);
      this.logHandler.log('【第二次发送位置】：完成');

      // 保存缓存
      await this.setKey(this.redisKey, this.sessionId, JSESSION_EXPIRE_TIME);
    }
    this.logHandler.log('【JSESSIONID】：' + this.sessionId);

    // 准备页面接口
    await this.attacker.perpareAttackNumber(this.sessionId);
    this.logHandler.log('【准备页面接口】：完成');
  }

  async queryNO(filer) {
    // 查号码
    const rslt = await this.attacker.searchPhNum(this.sessionId, { ...FILERPARAMS, ...filer });
    return rslt;
  }

  async getPrettyNoFromRule(phoneNumbs) {
    // 按规则,过滤出靓号
    const prettyNums = await this.attacker.getSelectPhNumByRule(phoneNumbs);
    return prettyNums;
  }

  async lockNumber(res_id) {
    return await this.attacker.attackNumber(this.sessionId, res_id);
  }

  async afterAttackNum(res_id) {
    return await this.attacker.afterAttackNum(this.sessionId, res_id);
  }

  async setKey(name, value, time) {
    await redis.setKey(name, value, time);//设置
  }

  async getKey(key) {
    return await redis.getKey(key);//获取key
  }

  async delKey(key) {
    return await redis.delKey(key);//获取key
  }

  //入库mysql
  async save(lockedNum, childAccount, type) {
    const { res_id } = lockedNum;
    let sql = "INSERT INTO number_detail(phone_num,busi_type,detail_json,create_by,update_by,is_release) VALUES (?, ?, ?, ?, ?, ?);"
    let addSqlParams = [res_id, type, JSON.stringify(lockedNum), childAccount, childAccount,-1];
    return await query(sql, addSqlParams)
  }

  async update(num_id, isRelease, comments) {
    let sql = "UPDATE number_detail SET is_release=?,comments=?,update_time=NOW() WHERE num_id=?;"
    let addSqlParams = [isRelease, comments, num_id];
    return await query(sql, addSqlParams)
  }

  // 查询2小时内库存
  async queryStoreNum(minute = 31, childAccount='dls_bszg00414') {
    let sqlStr = `
    select DISTINCT phone_num from number_detail
    where create_by = ?
    AND update_time between DATE_ADD(date_format(now(),'%Y-%m-%d %H:%i:%s'),interval -${minute} MINUTE)
    AND date_format(now(),'%Y-%m-%d %H:%i:%s')`;

    let addSqlParams = [childAccount];
    return await query(sqlStr, addSqlParams)
  }

  async queryOrderNum() {
    // let sqlStr = `select DISTINCT phone_num from number_detail
    //               where is_release = 0
    //               AND update_time BETWEEN DATE_ADD(date_format(now(),'%Y-%m-%d %H:%i:%s'),interval -${stime} MINUTE)
    //               AND DATE_ADD(date_format(now(),'%Y-%m-%d %H:%i:%s'),interval -${etime} MINUTE)`;


    let sqlStr = `select DISTINCT num_id,phone_num, is_release, update_time from number_detail where is_release != 1`;// 1 是已完成
    let addSqlParams = [];
    return await query(sqlStr, addSqlParams)
  }
}

export default AttackHelper;
