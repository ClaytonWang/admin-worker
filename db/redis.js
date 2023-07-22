'use strict';


import redis from "redis";

const redis_config = {
  host: 'jxray.moyebuy.com',
  port: '6379',
  password: '2023redis!',
  number: 0,
}

const url = `redis://:${redis_config.password}@${redis_config.host}:${redis_config.port}/${redis_config.number}`

const redisClient = redis.createClient({ 'url': url })

redisClient.on('ready', () => {
  // console.log('redis is ready...')
})

redisClient.on('error', err => {
  console.err(err)
})

async function fun(callback, key, value) {
  return new Promise(async (res, rej) => {
    await redisClient.connect()     // 连接
    const ok = callback(key, value)   // 成功ok
    await redisClient.quit()        // 关闭
    res(ok)
  })
}

const setKey = async (key, value, time) => {
  return fun(async () => {
    return await redisClient.set(key, value, { EX: time })
  }, key, value)
};

const getKey = async (key) => {
  return fun(async () => {
    return await redisClient.get(key)
  }, key)
};
const delKey = async (key) => {
  return fun(async () => {
    return await redisClient.del(key)
  }, key)
};

export default {
  setKey, getKey, delKey
};
