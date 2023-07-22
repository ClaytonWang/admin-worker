import { fork } from 'child_process';
import query from './db/mysql';
import LogHandler from './logHandler';

//  todo :取配置信息
async function getConfig() {
  let arrConfigs = [];
  const confs = await queryConfig();
  if (confs && confs.length > 0) {
    for (const conf of confs) {
      let filters = [
        {
          iPrestoreFee: JSON.parse(conf['prestore_fee']),
        },
        { fuzzyBillId: true }
      ].concat(JSON.parse(conf['mini_fee']));

      const arrFilters = [];
      for (const filter of filters) {
        for (const key in filter) {
          const value = filter[key];
          if (Array.isArray(value)) {
            for (const v of value) {
              const obj = {};
              obj[key] = v;
              arrFilters.push(obj)
            }
          } else if (!arrFilters.includes(filter)) {
            arrFilters.push(filter)
          }
        }
      }

      arrConfigs.push({
        name: conf['name'],
        token: conf['token'],
        period_time: conf['period_time'],
        max_store_mount: conf['maxStoreMount'],
        filters: arrFilters,
      });
    }
  }

  return arrConfigs;
}

async function bang() {
  try {
    const arrConfigs = await getConfig();
    if (arrConfigs.length === 0) {
      console.log('没有配置信息.')
      return;
    }

    for (const { token, name, filters, period_time, max_store_mount } of arrConfigs) {
      for (const filter of filters) {

        // console.log(filter);
        const strType = Object.keys(filter).join() + Object.values(filter).join();
        if (('fuzzyBillId' in filter)) {
          const w = fork('./priorityStoreWorker.js');
          w.send({ token, name, filter });
          w.on('exit', () => {
            const logger = new LogHandler(name, 'index/' + strType);
            logger.log('程序' + JSON.stringify(filter) + '报错退出!')
          });
        } else {
          const w = fork('./attackWorker.js');
          w.send({ token, name, filter, period_time, max_store_mount });
          w.on('exit', () => {
            const logger = new LogHandler(name, 'index/' + strType);
            logger.log('程序' + JSON.stringify(filter) + '报错退出!')
          });
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

async function queryConfig() {
  let sqlStr = `SELECT * from config_detail`;
  let addSqlParams = [];
  return await query(sqlStr, addSqlParams)
}

await bang();
