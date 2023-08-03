import { createPool } from 'mysql';

const pool = createPool({
  // host: 'www.xuanlianghao.cn',
  host: 'mysql',
  user: 'root',
  password: 'admin2023',
  database: 'admin'
});

let query = function (sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection(function (err, connection) {
      if (err) {
        reject(err)
      } else {
        connection.query(sql, values, (err, rows) => {

          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
          connection.release()
        })
      }
    })
  })
}

export default query
