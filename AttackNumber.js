'use strict';

// const JobHandlerLog = require('./JobHandlerLog');
import GlobalError from './GlobalError';
import RESULT from './constants/result';
import { request } from 'urllib';

const { RESULT_FAIL, RESULT_LOGIN_FAIL } = RESULT;

export default class AttackNumber {
  constructor(ssoToken) {
    this.ssoToken = ssoToken;
    this.rulesObj = {
      AABB: new RegExp(/^[0-9]{7}(\d)\1((?!\1)\d)\2$/, 'g'),
      XAAA: new RegExp(/^[0-9]{8}(\d)\1{2}$/, 'g'),
      AAAB: new RegExp(/^[0-9]{7}(\d)\1{2}((?!\1)\d)$/, 'g'),
      ABAB: new RegExp(/^[0-9]{7}(\d)((?!\1)\d)\1\2$/, 'g'),
      // AABA: new RegExp(/^[0-9]{7}(\d)\1((?!\1)\d)\1$/, 'g'),
      // ABAA: new RegExp(/^[0-9]{7}(\d)((?!\1)\d)\1{2}$/, 'g'),
      // ABBA: new RegExp(/^[0-9]{7}(\d)((?!\1)\d)\2\1$/, 'g'),
      ABCD: new RegExp(
        '(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)){3}\\d',
        'g'
      ),
      ABCDE: new RegExp(
        '(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)){4}\\d',
        'g'
      ),
    };
  }

  /**
   * 调用接口任务
   * @param {*} params 任务参数
   */
  async curlHandler(params) {
    // 获取参数
    const rslt = await request(params.url, {
      method: params.method,
      data: params.data,
      headers: params.headers,
      dataType: params.dataType ? params.dataType : 'json',
      timeout: params.timeout ? params.timeout : [5000, 50000],
    });
    if (rslt && rslt.data) {
      const { code, msg } = rslt.data;
      if (code === RESULT_LOGIN_FAIL || code === '-1') {
        throw new GlobalError(RESULT_FAIL, msg);
      }
    }
    return rslt;
  }

  /** *
   * 登录成功后第一次请求,返回的是301跳转,app中用来拿准备选号的页面,
   */
  async getPage() {
    const params = {
      method: 'GET',
      url: 'http://211.136.111.153:8080/MOP_ac/PadcrmOpenService',
      data: {
        action: 'getPage',
        menuId: '60021183',
        channel: 'APP4A',
        ssoToken: this.ssoToken,
      },
      dataType: 'text',
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': 1,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; V2271A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.74 Mobile Safari/537.36/shyd4a/shydyy/',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'X-Requested-With': 'com.sh.cm.grid4a',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    };
    const result = await this.curlHandler(params);
    const cookie = result.headers['set-cookie'][0];
    return cookie.split(';')[0];
  }

  /**
   * 登录成功后第二次请求,用来发送当前app所再的位置,非上海的位置不允许使用
   * 返回ssoToken,JSESSIONID
   */
  async sendLocation() {
    const location = JSON.stringify({ address: '上海市嘉定区交运路464号', city: '上海市', district: '嘉定区', exeResult: 1, lat: 31.296245, lng: 121.195396, locationType: 'GD', province: '上海市', street: '交运路', streetNumber: '464号' });
    const device = JSON.stringify({ device: { appVersion: '1.9.4.3', availMemory: '4.15 GB', brand: 'vivo', c_id: '948fdb4b05639667', density: 3, model: 'V2271A', os: 'android', osVersion: 33, totalMemory: '7.81 GB' } });
    const params = {
      method: 'GET',
      url: 'http://211.136.111.153:8080/MOP_ac/PadcrmOpenService',
      data: {
        action: 'getPage',
        menuId: '60021183',
        channel: 'APP4A',
        ssoToken: this.ssoToken,
        customCode: '',
        callback: '',
        device,
        location,
      },
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; V2271A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.74 Mobile Safari/537.36/shyd4a/shydyy/',
        'X-Requested-With': 'com.sh.cm.grid4a',
        Referer: 'http://211.136.111.153:8080/MOP_ac/page-sh/other/',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    };
    const result = await this.curlHandler(params);
    const { url, code, msg } = result.data;
    if (code === RESULT_LOGIN_FAIL) {
      throw Error(msg);
    }

    let sessionId = '';
    if (url && url.length > 0 && url.indexOf('JSESSIONID') !== -1) {
      sessionId = url.split('&')[1];
    }

    return sessionId;
  }

  async perpareAttackNumber(sessionId) {
    if (!this.ssoToken || !sessionId) {
      throw new GlobalError(RESULT_FAIL, '准备取号时,会话信息丢失，请检查');
    }
    const params = {
      method: 'POST',
      url: 'http://211.136.111.153:8080/MOP_ac/PadcrmSocialOpenAccountService?action=init',
      headers: {
        Pragma: 'no - cache',
        'Cache-Control': 'no-cache',
        Accept: 'application/json, text/plain, */*',
        menuId: '60021183',
        channel: 'APP4A',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; V2271A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.74 Mobile Safari/537.36/shyd4a/shydyy/',
        ssoToken: this.ssoToken,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'http://211.136.111.153:8080',
        'X-Requested-With': 'com.sh.cm.grid4a',
        Referer: 'http://211.136.111.153:8080/MOP_ac/newMenu/padcrm/',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        Cookie: `${sessionId}`,
      },
    };
    const result = await this.curlHandler(params);
    return result;
  }

  async attackNumber(sessionId, pNumber) {
    if (!this.ssoToken || !sessionId) {
      throw new GlobalError(RESULT_FAIL, '锁号时,会话信息丢失，请检查');
    }

    if (!pNumber) {
      throw new GlobalError(RESULT_FAIL, '未指定要选的号码');
    }

    const params = {
      method: 'POST',
      url: 'http://211.136.111.153:8080/MOP_ac/PadcrmSocialOpenAccountService?action=attackNumber',
      data: {
        checkednumber: pNumber,
      },
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Accept: 'application/json, text/plain, */*',
        menuId: '60021183',
        channel: 'APP4A',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; V2271A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.74 Mobile Safari/537.36/shyd4a/shydyy/',
        ssoToken: this.ssoToken,
        Cookie: `${sessionId}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'http://211.136.111.153:8080',
        'X-Requested-With': ' com.sh.cm.grid4a',
        Referer: 'http://211.136.111.153:8080/MOP_ac/newMenu/padcrm/',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    };
    // const result = await this.curlHandler(params);
    const result = [];
    return result;
  }

  async afterAttackNum(sessionId, pNumber) {
    const params = {
      method: 'POST',
      url: 'http://211.136.111.153:8080/MOP_ac/socialOpenAccount.do?action=isOptNumber',
      data: {
        type: '4A',
        photoNumber: pNumber,
      },
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Accept: 'application/json, text/plain, */*',
        menuId: '60021183',
        channel: 'APP4A',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; V2271A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.74 Mobile Safari/537.36/shyd4a/shydyy/',
        ssoToken: this.ssoToken,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'http://211.136.111.153:8080',
        'X-Requested-With': 'com.sh.cm.grid4a',
        Referer: 'http://211.136.111.153:8080/MOP_ac/newMenu/padcrm/',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        Cookie: `${sessionId}`,
        Connection: 'keep-alive',
      },
    };
    const result = await this.curlHandler(params);
    return result;
  }

  // 查号码
  async searchPhNum(sessionId, filerParams) {

    if (!this.ssoToken || !sessionId) {
      throw new GlobalError(RESULT_FAIL, '锁号时,会话信息丢失，请检查');
    }

    const params = {
      method: 'POST',
      url: 'http://211.136.111.153:8080/MOP_ac/PadcrmSocialOpenAccountService?action=queryNumber',
      data: { ...filerParams },
      // 创建连接超时 5 秒，接收响应超时 30 秒，用于响应比较大的场景
      timeout: [5000, 50000],
      // dataType: 'text',
      headers: {
        Accept: 'application/json, text/plain, */*',
        channel: 'APP4A',
        ssoToken: this.ssoToken,
        Cookie: `${sessionId}`,
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json;charset=UTF-8',
        Origin: 'http://211.136.111.153:8080',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; V2271A Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.74 Mobile Safari/537.36/shyd4a/shydyy/',
        menuId: '60021183',
        Referer: 'http://211.136.111.153:8080/MOP_ac/newMenu/padcrm/',
        Connection: 'keep-alive',
      },
    };
    const result = await this.curlHandler(params);
    return result.data;
  }

  async getSelectPhNumByRule(numbers) {
    if (!numbers) {
      throw new GlobalError(RESULT_FAIL, '搜索号码结果为空,请检查.');
    }
    if (numbers && numbers.length === 0) {
      throw new GlobalError(RESULT_FAIL, '搜索号码结果为空,请检查.');
    }

    const prettyNums = [];
    for (const item of numbers) {
      for (const rule in this.rulesObj) {
        const reg = this.rulesObj[rule];
        const phone = item.res_id;

        if (phone.match(reg) != null && !prettyNums.includes(phone)) {
          prettyNums.push({ ...item, rule });
        }
      }
    }
    return prettyNums;
  }
}
