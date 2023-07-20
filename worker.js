'use strict';

// import users from "./config/users.json";
// import tasks from "./config/tasks.json";
import AttackHelper from "./AttackHelper.js";

const periodTime = 5000;
const continuePeriodTime = 1000;

export default class Worker {
  constructor(token) {
    this.helper = new AttackHelper(token);
  }

  async run() {
    await this.helper.init();
    await this.helper.prepareQuery();

    // 预存款条件
    const iPrestoreFees = ['1', '2', '4', '5', '6'];

    const doActoin = async (iPrestoreFee) => {
      const phoneNo = await this.helper.queryNO({ iPrestoreFee });
      const prettyNo = await this.helper.getPrettyNoFromRule(phoneNo);
      if (prettyNo.length > 0) {
        //const lockedNum = await this.helper.lockNumber(prettyNo);
        //入库mysql
        //await this.helper.save(lockedNum);

        setTimeout(async () => {
          await doActoin(iPrestoreFee);
        }, periodTime);

      } else {
        //没找到靓号,隔1秒后继续找
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
