import Worker from './worker.js';

const users = [
  {
    "name": "dls_bszg00414",
    "token": "TjBHRHYwWFJSVmFieGlwUDhRanJaK0JEYjNLZlRnTk15UTVRY0VpTjNUQ0lqNHRq"
  }
];

try {
  for (const user of users) {
    const w = new Worker(user.token);
    w.run();
  }

} catch (error) {
  console.log('错误信息:s%', error)
}
