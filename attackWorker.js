'use strict';

// import users from "./config/users.json";
// import tasks from "./config/tasks.json";
import AttackHelper from "./AttackHelper.js";
import LogHandler from "./logHandler.js"

let periodTime = 30000;
let continuePeriodTime = 5000;
let storeTime = 31;// minute
let maxStoreMount = 50; //最大库存量

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
        await doAction(filter);
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

      // 当前账号库存满了不查询
      const storeNum = await this.helper.queryStoreNum(storeTime, name);

      // 剩余库存量
      let curStoreMount = maxStoreMount - storeNum.length;
      logHandler.log('【剩余库存量】：' + curStoreMount);

      if (storeNum.length >= maxStoreMount) {
        logHandler.log(`库存已满${maxStoreMount},不刷号.`);
        await loop(periodTime);
        return;
      }

      const { selectPool: phoneNos } = await this.helper.queryNO(filter);
      logHandler.log(`【当前条件"${JSON.stringify(filter)}"查出号码】：${phoneNos.length}个,`);

      if (phoneNos.length === 0) {
        await loop(periodTime);
        return;
      }

      const prettyNums = await this.helper.getPrettyNoFromRule(phoneNos);
      if (prettyNums.length > 0) {
        const noLogs = prettyNums.map(value => {
          return value.res_id + '|' + value.rule;
        });
        logHandler.log(`【当前条件"${JSON.stringify(filter)}"选中的靓号${prettyNums.length}个】：${JSON.stringify(noLogs)}`);

        const maxNum = prettyNums.length > curStoreMount ? curStoreMount : prettyNums.length;

        for (let i = 0; i < maxNum; i++) {
          const { res_id } = prettyNums[i]
          try {
            const rslLock = await this.helper.lockNumber(res_id);
            logHandler.log('【锁号完成】：' + res_id + "返回:" + JSON.stringify(rslLock));

            //入库mysql
            await this.helper.save(prettyNums[i], name, strType);
            logHandler.log('【入库】：完成' + res_id);

            // 锁号完,调页面接口
            const aftRsl = await this.helper.afterAttackNum(this.sessionId, res_id);
            logHandler.log('【AfterLockNum】：' + res_id + "返回:" + JSON.stringify(aftRsl));
          } catch (error) {
            logHandler.log('【锁号失败】：' + res_id,);
            logHandler.log(error);
          }
        }

        await loop(periodTime);
      } else {
        logHandler.log(`【当前条件"${strType}"没有靓号】`);
        //没找到靓号,隔5秒后继续找
        await loop(continuePeriodTime);
      }
    }

    try {
      await doAction(filter);
    } catch (error) {
      logHandler.log(error);
      throw error;
    }
  }
}

process.on("message", async ({ token, name, filter, period_time, max_store_mount }) => {
  try {
    if (period_time) {
      periodTime = period_time;
    }

    if (max_store_mount) {
      maxStoreMount = max_store_mount;
    }

    const w = new Worker(token);
    await w.run(filter, name);
  } catch (error) {
    const strType = Object.keys(filter).join() + Object.values(filter).join();
    const logger = new LogHandler(name, 'process/' + strType);
    logger.log('错误信息' + error);
    process.exit(1);
  }
});
