'use strict';

import AttackNumber from './AttackNumber';
import redis from './redis';
import CONSTANTS from './constants';
import REDIS from './constants/redis';

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
      await this.attacker.sendLocation(this.sessionId);
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
    const prettyNo = await this.attacker.getSelectPhNumByRule(phoneNumbs);
    const noLogs = prettyNo.map(value => {
      return value.item.res_id + '|' + value.rule;
    });
    console.log('【选中的号】：%s', prettyNo.length === 0 ? '当前条件没有靓号' : JSON.stringify(noLogs));
    return prettyNo;
  }

  async lockNumber(prettyNo) {
    const lockedNumb = [];
    //锁号
    for (const item of prettyNo) {
      try {
        await this.attacker.attackNumber(this.sessionId, item.phone);
        lockedNumb.push(item);
        // 锁号完,调页面接口
        await this.attacker.afterAttackNum(this.sessionId, item.phone);
      } catch (error) {
        console.log('【锁号失败】：%s', item.phone);
        console.log('【错误信息】：%s', error);
      }
    }
    return lockedNumb;
  }

  async setKey(name, value) {
    await redis.setKey(name, value);//设置
  }

  async getKey(name) {
    return await redis.getKey(name);//获取key
  }

  //入库mysql
  async save() {

  }
}

export default AttackHelper;
