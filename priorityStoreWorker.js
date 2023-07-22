'use strict';

import AttackHelper from "./AttackHelper.js";
import LogHandler from "./logHandler.js"

const periodTime = 10000;
const expSTime = 25;// MINUTE
const expETime = 40;// MINUTE

export default class Worker {
  constructor(token) {
    this.helper = new AttackHelper(token);
  }

  /**
 * stime 开始时间 etime 结束时间
 */
  compareTime(stime, etime) {
    const now = new Date();
    const nowHours = now.getHours();

    if (nowHours > stime && nowHours < etime) {
      return true;
    }
    return false;
  }

  async run(filter, name) {
    const strType = Object.keys(filter).join() + ":" + Object.values(filter).join();
    const logHandler = new LogHandler(name, strType);

    //0 到 5点 不查询
    const isInValidePeriod = this.compareTime(4, 24);
    if (!isInValidePeriod) {
      logHandler.log('0到5点时间段选号API下线,不进行任何操作.');
      return;
    }

    await this.helper.init(logHandler);
    await this.helper.prepareQuery();

    const loop = async (time) => {
      setTimeout(async () => {
        await doAction();
      }, time);
    }

    const doAction = async () => {
      //0 到 5点 不查询
      const isInValidePeriod = this.compareTime(4, 24);
      if (!isInValidePeriod) {
        logHandler.log('0到5点时间段选号API下线,不进行任何操作.');
        await loop(periodTime);
        return;
      }

      // todo: 优先占自己释放的号码
      const expireNum = await this.helper.queryExpireNum(expSTime, expETime, name);
      if (!expireNum || expireNum.length === 0) {
        logHandler.log('没有过期的号码.');
        await loop(periodTime);
        return;
      }

      for (const numObj of expireNum) {
        filter['fuzzyBillId'] = numObj['phone_num'];

        //查到了,没被别人占走,才能锁号
        const { selectPool: phoneNos } = await this.helper.queryNO(filter);


        // if (phoneNos.length === 0) {
        //   console.log('【%s没过期】：%s', numObj['phone_num'], (new Date).toLocaleString());
        // } else {
        //   console.log('【%s过期】：%s', numObj['phone_num'], (new Date).toLocaleString());
        // }

        //锁号
        const lockedNums = await this.helper.lockNumber(phoneNos, 2);

        logHandler.log('【锁号】：完成');

        for (const item of lockedNums) {
          ////入库mysql
          await this.helper.save(item, name, strType);
        }
        logHandler.log('【入库】：完成');
      }
      await loop(periodTime);
    }
    await doAction();
  }
}

process.on("message", async ({ token, name, filter }) => {
  try {
    const w = new Worker(token);
    await w.run(filter, name);
  } catch (error) {
    const strType = Object.keys(filter).join() + Object.values(filter).join();
    const logger = new LogHandler(name, 'process/' + strType);
    logger.log(error);
    process.exit(0);
  }
});
