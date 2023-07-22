
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS
= 0;

-- ----------------------------
-- Table structure for config_detail
-- ----------------------------
DROP TABLE IF EXISTS `config_detail`;
CREATE TABLE `config_detail`
(
  `cfg_id` int
(11) NOT NULL AUTO_INCREMENT,
	`name` varchar
(50) NOT NULL DEFAULT '' COMMENT '账号',
	`token` varchar
(500) NOT NULL DEFAULT '' COMMENT 'token',
  `period_time` int
(11) NOT NULL  COMMENT '取完号后间隔时间',
  `continue_period_time` int
(11) NOT NULL COMMENT '没取到号后继续刷号时间',
  `stime` int
(11) NOT NULL COMMENT '锁到的号释放出去的开始时间',
	`etime` int
(11) NOT NULL COMMENT '锁到的号释放出去的结束时间',
  `maxStoreMount` int
(11) NOT NULL COMMENT '库存最大值',
	`prestore_fee` mediumtext COMMENT '预先存款',
	`mini_fee` mediumtext COMMENT '最低消费',
	`reg_exp` mediumtext COMMENT '选号规则JSON数据',
	`is_priority_store` tinyint
(1) NOT NULL DEFAULT '1' COMMENT '是否优先拿库存中释放的号：0:未否 1:是',
  `create_by` varchar
(100) NOT NULL COMMENT '更新人',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON
UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_delete
` tinyint
(1) NOT NULL DEFAULT '0' COMMENT '是否删除：0:未删除 -1:删除',
  PRIMARY KEY
(`cfg_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='定时任务表';

INSERT INTO config_detail
VALUES(1, 'dls_bszg00414', 'd3hlUXBqT2ZBMkxaTnI4ZUhLVGx6dlFpQTZBek96alVyYm5SSkl0V2daRVR0UEds', 30000, 5000, 25, 40, 50, '["1","2","4","5","6"]', '[{"iMiniFee":"0"},{"iMiniFee":"3000","iMinimumFee":"1"},{"iMiniFee":">3000","iMinimumFee":"1"},{"iMinimumFee":"2"},{"iMinimumFee":"3"},{"iMinimumFee":"4"},{"fuzzyBillId":true}]',
    '', 1, 'dls_bszg00414', NOW(), NOW(), 0)

