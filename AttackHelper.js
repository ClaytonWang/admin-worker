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
  }

  async init() {
    this.attacker = new AttackNumber(this.token);
    this.sessionId = await this.getKey(this.redisKey);
  }

  async prepareQuery(force = false) {
    // 第一次或10分钟后重新认证一下
    if (!this.sessionId || force) {
      // 第一次302跳转页面
      this.sessionId = await this.attacker.getPage();
      console.log('【第一次302跳转页面】：%s', '完成');

      // 超时,自动 重新拿JSESSIONID
      this.sessionId = await this.attacker.sendLocation(this.sessionId);
      console.log('【第二次发送位置】：%s', '完成');

      // 保存缓存
      await this.setKey(this.redisKey, this.sessionId, 'Ex', JSESSION_EXPIRE_TIME);
    }
    console.log('【JSESSIONID】：%s', this.sessionId);

    // 准备页面接口
    await this.attacker.perpareAttackNumber(this.sessionId);
    console.log('【准备页面接口】：%s', '完成');
  }

  async queryNO(filer) {
    // 查号码
    const rslt = await this.attacker.searchPhNum(this.sessionId, { ...FILERPARAMS, ...filer });
    console.log('【查号码】：%s', '完成');
    return rslt;
  }

  async getPrettyNoFromRule(phoneNumbs) {
    // 按规则,过滤出靓号
    const prettyNums = await this.attacker.getSelectPhNumByRule(phoneNumbs);
    return prettyNums;
  }

  async lockNumber(prettyNos, curStoreMount) {
    const lockedNumb = [];
    //锁号
    for (let i = 0; i < curStoreMount; i++) {
      const { item } = prettyNos[i]
      const { res_id } = item;
      try {
        await this.attacker.attackNumber(this.sessionId, res_id);
        console.log('【锁号...】：%s', res_id);
        lockedNumb.push(item);
        // 锁号完,调页面接口
        await this.attacker.afterAttackNum(this.sessionId, res_id);
      } catch (error) {
        console.log('【锁号失败】：%s', res_id);
        console.log('【错误信息】：%s', error);
      }
    }
    return lockedNumb;
  }

  async setKey(name, value, ex, time) {
    await redis.setKey(name, value, ex, time);//设置
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
  async queryStoreNum(hours = 2, childAccount) {
    let sqlStr = `select num_id from number_detail
                where create_by = ?
                AND create_time between date_format(now(),'%Y-%m-%d %H:00:00')
                AND DATE_ADD(date_format(now(),'%Y-%m-%d %H:00:00'),interval ${hours} hour)`;

    let addSqlParams = [childAccount];
    return await query(sqlStr, addSqlParams)
  }
}

export default AttackHelper;
