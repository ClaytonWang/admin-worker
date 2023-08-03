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
      const expireNum = await this.helper.queryExpireNum(expSTime, expETime);
      if (!expireNum || expireNum.length === 0) {
        logHandler.log('没有过期的号码.');
        await loop(periodTime);
        return;
      }

      // 有过期号码
      for (const numObj of expireNum) {
        const { phone_num: res_id } = numObj['phone_num']
        filter['fuzzyBillId'] = res_id;

        try {
          await this.helper.prepareQuery();

          //查到了,没被别人占走,才能锁号
          const { selectPool: phoneNos } = await this.helper.queryNO(filter);

          if (phoneNos.length > 0) {
            //锁号
            let { data, status } = await this.helper.lockNumber(res_id);
            if (status == 200 && data.code == 0) {
              logHandler.log('【锁号成功】：' + res_id);
              //入库mysql
              await this.helper.save(phoneNos[0], 'automation', strType);
              logHandler.log('【入库完成】：' + res_id);

              // 锁号完,调页面接口automation
              const aftRsl = await this.helper.afterAttackNum(res_id);
              logHandler.log('【AfterLockNum】：' + res_id + "返回:" + JSON.stringify(aftRsl.data));
            } else {
              logHandler.log('【锁号失败】：' + res_id + "返回" + JSON.stringify(data));
            }
          } else {
            //号被抢走或者客户购买了
            await this.helper.update(numObj['num_id'], 1, '号被者客户购买了或者被其他人抢走');
          }

        } catch (error) {
          logHandler.log('【锁号失败】：' + res_id + '====' + JSON.stringify(error));
        }
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
