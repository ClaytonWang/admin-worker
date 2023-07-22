'use strict';

import AttackNumber from './AttackNumber';
import redis from './db/redis';
import CONSTANTS from './constants';
import REDIS from './constants/redis';
import query from './db/mysql';
import LogHandler from "./logHandler.js"

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

  async init(name, type) {
    this.attacker = new AttackNumber(this.token);
    this.sessionId = await this.getKey(this.redisKey);
    this.logHandler = new LogHandler(name, type);
  }

  async prepareQuery(force = false) {
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
    this.logHandler.log('【查号码】：完成');
    return rslt;
  }

  async getPrettyNoFromRule(phoneNumbs) {
    // 按规则,过滤出靓号
    const prettyNums = await this.attacker.getSelectPhNumByRule(phoneNumbs);
    return prettyNums;
  }

  async lockNumber(prettyNos, curStoreMount) {
    const lockedNumb = [];
    if (prettyNos.length === 0) return lockedNumb;

    const num = prettyNos.length > curStoreMount ? curStoreMount : prettyNos.length;
    //锁号
    for (let i = 0; i < num; i++) {
      const { res_id } = prettyNos[i]
      try {
        await this.attacker.attackNumber(this.sessionId, res_id);
        this.logHandler.log('【锁号...】：' + res_id,);
        lockedNumb.push(prettyNos[i]);
        // 锁号完,调页面接口
        await this.attacker.afterAttackNum(this.sessionId, res_id);
      } catch (error) {
        this.logHandler.log('【锁号失败】：' + res_id,);
        this.logHandler.log(error);
      }
    }
    return lockedNumb;
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
    let sql = "INSERT INTO number_detail(phone_num,busi_type,detail_json,create_by,update_by) VALUES (?, ?, ?, ?, ?);"
    let addSqlParams = [res_id, type, JSON.stringify(lockedNum), childAccount, childAccount];
    return await query(sql, addSqlParams)
  }

  // 查询2小时内库存
  async queryStoreNum(minute = 31, childAccount) {
    let sqlStr = `select num_id from number_detail
                where create_by = ?
                AND create_time between date_format(now(),'%Y-%m-%d %H:%i:%s')
                AND DATE_ADD(date_format(now(),'%Y-%m-%d %H:%i:%s'),interval -${minute} MINUTE)`;

    let addSqlParams = [childAccount];
    return await query(sqlStr, addSqlParams)
  }

  async queryExpireNum(stime, etime, childAccount) {
    let sqlStr = `select DISTINCT phone_num from number_detail
                  where create_by = ?
                  AND create_time BETWEEN DATE_ADD(date_format(now(),'%Y-%m-%d %H:%i:%s'),interval -${stime} MINUTE)
                  AND DATE_ADD(date_format(now(),'%Y-%m-%d %H:%i:%s'),interval -${etime} MINUTE)`;

    // let sqlStr = `select phone_num from number_detail where num_id=201`;
    let addSqlParams = [childAccount];
    return await query(sqlStr, addSqlParams)
  }
}

export default AttackHelper;
