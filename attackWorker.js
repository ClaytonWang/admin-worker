'use strict';

import AttackHelper from "./AttackHelper.js";
import LogHandler from "./logHandler.js"
import REDIS from './constants/redis';

let periodTime = 30000;
let continuePeriodTime = 30000;
let storeTime = 31;// minute
let maxStoreMount = 5; //最大库存量
const { GLOABLENUM } = REDIS;
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

    const doAction = async (filter) => {
      try {
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
        // maxStoreMount = 5

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
          //没找到继续循环找
          await loop(periodTime);
          return;
        }

        const prettyNums = await this.helper.getPrettyNoFromRule(phoneNos);
        if (prettyNums.length > 0) {
          //临时缓存不同条件查出的号,以免多个接口没锁号前重复.
          let clearedNums = [];
          const strExitNums = await this.helper.getKey(GLOABLENUM);
          if (!strExitNums) {
            clearedNums = prettyNums;
          } else {
            const existNums = JSON.parse(strExitNums);
            for (const pNum of prettyNums) {
              if (!existNums.includes(pNum)) {
                clearedNums.push(pNum);
              }
            }
          }

          if (clearedNums.length === 0) {
            //没找到继续循环找
            await loop(periodTime);
            return;
          }

          //有概率多进程同时访问的
          await this.helper.setKey(GLOABLENUM, JSON.stringify(clearedNums), 50000);

          logHandler.log(`【当前条件"${JSON.stringify(filter)}"选中的靓号${clearedNums.length}个】.`);

          let maxNum = prettyNums.length > curStoreMount ? curStoreMount : prettyNums.length;
          //一次最大只锁10个号
          maxNum = maxNum > 10 ? 10 : maxNum;
          for (let i = 0; i < maxNum; i++) {
            const { res_id } = prettyNums[i]
            try {
              let { data, status } = await this.helper.lockNumber(res_id);
              if (status == 200 && data.code == 0) {
                logHandler.log('【锁号成功】：' + res_id);
                //入库mysql
                await this.helper.save(prettyNums[i], name, strType);
                logHandler.log('【入库完成】：' + res_id);

                // 锁号完,调页面接口
                const aftRsl = await this.helper.afterAttackNum(res_id);
                logHandler.log('【AfterLockNum】：' + res_id + "返回:" + JSON.stringify(aftRsl.data));
              } else {
                logHandler.log('【锁号失败】：' + res_id + "返回" + JSON.stringify(data));
              }
            } catch (error) {
              logHandler.log('【锁号失败】：' + res_id + '====' + JSON.stringify(error));
            }
          }

          await this.helper.delKey(GLOABLENUM);

          await loop(periodTime);
        } else {
          logHandler.log(`【当前条件"${strType}"没有靓号】`);
          //没找到靓号,隔5秒后继续找
          await loop(continuePeriodTime);
        }
      } catch (error) {
        logHandler.log(error);
        process.send('exit');
      }
    }

    await doAction(filter);
  }
}

process.on("message", async ({ token, name, filter, period_time, max_store_mount }) => {
  if (period_time) {
    periodTime = period_time;
  }

  if (max_store_mount) {
    maxStoreMount = max_store_mount;
  }

  const w = new Worker(token);
  await w.run(filter, name);
});
