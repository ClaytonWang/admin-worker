import { fork } from 'child_process';

const users = [
  {
    name: "dls_bszg00414",
    token: "TjBHRHYwWFJSVmFieGlwUDhRanJaK0JEYjNLZlRnTk15UTVRY0VpTjNUQ0lqNHRq",
  }
];
const filters = [
  //预存
  { iPrestoreFee: ['1', '2', '4', '5', '6'] },
  //月消费
  { iMiniFee: "0" },//0以下
  { iMiniFee: "3000", iMinimumFee: "1" },//30 以下
  { iMiniFee: ">3000", iMinimumFee: "1" },//30-50
  { iMinimumFee: "2" },//50-150
  { iMinimumFee: "3" },//150 - 300
  { iMinimumFee: "4" }//300上
];

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

for (const { token, name } of users) {
  for (const filter of arrFilters) {
    const w = fork('./worker.js');
    w.send({ token, name, filter });
  }
}
