'use strict';

// import users from "./config/users.json";
// import tasks from "./config/tasks.json";
import AttackHelper from "./AttackHelper.js";

const periodTime = 30000;
const continuePeriodTime = 5000;
const storeTime = 2;//2 hore
const maxStoreMount = 50; //最大库存量
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

    //0 到 5点 不查询
    const isInValidePeriod = this.compareTime(4, 24);
    if (!isInValidePeriod) {
      console.log('0到5点时间段选号API下线,不进行任何操作.%s', filter);
      return;
    }

    await this.helper.init();
    await this.helper.prepareQuery();

    const loop = async (time) => {
      setTimeout(async () => {
        await doAction(filter);
      }, time);
    }

    doAction = async () => {
      //0 到 5点 不查询
      const isInValidePeriod = this.compareTime(4, 24);
      if (!isInValidePeriod) {
        console.log('0到5点时间段选号API下线,不进行任何操作.%s', filter);
        await loop(periodTime);
        return;
      }

      // 当前账号库存满了不查询
      const storeNum = await this.helper.queryStoreNum(storeTime, name);
      // 剩余库存量
      let curStoreMount = maxStoreMount - storeNum.length;
      console.log('【剩余库存量】：%s', curStoreMount);

      if (storeNum.length >= maxStoreMount) {
        console.log('账号%s,库存已满%s,不刷号.%s', name, maxStoreMount, (new Date).toLocaleString());
        await loop(periodTime);
        return;
      }

      const { selectPool: phoneNos } = await this.helper.queryNO(filter);
      const strType = Object.keys(filter).join() + ":" + Object.values(filter).join();
      const prettyNums = await this.helper.getPrettyNoFromRule(phoneNos);
      if (prettyNums.length > 0) {
        const noLogs = prettyNums.map(value => {
          return value.item.res_id + '|' + value.rule;
        });
        console.log('【当前条件"iPrestoreFee:%s"选中的号】：%s', filter, JSON.stringify(noLogs));

        //锁号
        const lockedNums = await this.helper.lockNumber(prettyNums, curStoreMount);

        console.log('【锁号】：%s', '完成');


        for (const item of lockedNums) {
          ////入库mysql
          await this.helper.save(item, name, strType);
        }
        console.log('【入库】：%s', '完成');

        await loop(periodTime);
      } else {
        console.log('【当前条件"%s"没有靓号】：%s', strType, (new Date).toLocaleString());
        //没找到靓号,隔5秒后继续找
        await loop(continuePeriodTime);
      }
    }

    await doAction(filter);
  }
}

process.on("message", async ({ token, name, filter }) => {
  try {
    const w = new Worker(token)
    await w.run(filter, name);
  } catch (error) {
    console.log('错误:%s', error)
  }
});
