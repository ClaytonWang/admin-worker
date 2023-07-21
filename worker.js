'use strict';

// import users from "./config/users.json";
// import tasks from "./config/tasks.json";
import AttackHelper from "./AttackHelper.js";

const periodTime = 5000;
const continuePeriodTime = 3000;

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

  async run() {
    await this.helper.init();
    await this.helper.prepareQuery();

    // 预存款条件
    const iPrestoreFees = ['1', '2', '4', '5', '6'];

    const doActoin = async (iPrestoreFee) => {
      //0 到 5点 不查询
      const isInValidePeriod = this.compareTime(4, 24);
      if (!isInValidePeriod) {
        console.log('当前时间段选号API下线,不进行任何操作.');
        return;
      }

      const { selectPool: phoneNo, childAccount } = await this.helper.queryNO({ iPrestoreFee });

      const prettyNums = await this.helper.getPrettyNoFromRule(phoneNo);
      if (prettyNums.length > 0) {
        const noLogs = prettyNums.map(value => {
          return value.item.res_id + '|' + value.rule;
        });
        console.log('【当前条件"iPrestoreFee:%s"选中的号】：%s', JSON.stringify(noLogs));

        ////锁号
        //const lockedNum = await this.helper.lockNumber(prettyNo);
        ////入库mysql
        await this.helper.save(lockedNum, childAccount, 'iPrestoreFee:' + iPrestoreFee);

        setTimeout(async () => {
          await doActoin(iPrestoreFee);
        }, periodTime);

      } else {
        console.log('【当前条件"iPrestoreFee:%s"没有靓号】：%s', iPrestoreFee, (new Date).toLocaleString());

        //没找到靓号,隔3秒后继续找
        setTimeout(async () => {
          await doActoin(iPrestoreFee);
        }, continuePeriodTime);
      }
    }

    // for (const iPrestoreFee of iPrestoreFees) {
    //   setTimeout(async (iPrestoreFee) => {
    //     await doActoin(iPrestoreFee);
    //   }, periodTime);
    // }

    setTimeout(async () => {
      await doActoin('1');
    }, periodTime);

  }
}
