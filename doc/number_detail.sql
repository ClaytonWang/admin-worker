
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS
= 0;

-- ----------------------------
-- Table structure for number_detail
-- ----------------------------
DROP TABLE IF EXISTS `number_detail`;
CREATE TABLE `number_detail`
(
  `num_id` int
(11) NOT NULL AUTO_INCREMENT,
  `phone_num` varchar
(50) NOT NULL DEFAULT '' COMMENT '手机号',
  `busi_type` varchar
(50) NOT NULL DEFAULT '' COMMENT '业务类型',
  `detail_json` mediumtext COMMENT 'JSON数据',
  `create_by` varchar
(100) NOT NULL COMMENT '创建人',
  `update_by` varchar
(100) NOT NULL COMMENT '更新人',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON
UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_delete
` tinyint
(1) NOT NULL DEFAULT '0' COMMENT '是否删除：0:未删除 -1:删除',
  PRIMARY KEY
(`num_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='定时任务表';

