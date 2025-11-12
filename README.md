# 小红书信息搜集工具 

一个基于 Node.js 和 Playwright 的网页自动化工具，用于从小红书搜集帖子信息、评论数据和作者作品。

![小红书爬虫](https://img.shields.io/badge/小红书-信息搜集工具-red)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![Playwright](https://img.shields.io/badge/Playwright-自动化测试-blue)

## 功能特点

-  **关键词搜索** - 自动搜索指定关键词的相关帖子
-  **帖子详情抓取** - 获取帖子标题、内容、点赞、收藏、评论数
- **评论信息提取** - 抓取主评论和子评论内容
-  **作者作品分析** - 获取作者近期发布的帖子标题
- **数据导出** - 将结果保存为 JSON 文件
-  **调试支持** - 自动截图用于调试
-  **错误处理** - 完善的异常处理和重试机制

## 技术栈

- **Node.js** - 运行时环境
- **Playwright** - 浏览器自动化
- **Chromium** - 浏览器内核

## 安装步骤

### 前置要求
- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖
```bash
# 克隆项目
git clone https://github.com/你的用户名/xiaohongshu-scraper.git
cd xiaohongshu-scraper

# 安装依赖
npm install
```

## 使用方法

### 基本使用
```bash
# 使用默认关键词"前端"
node index.js

# 使用自定义关键词
node index.js "编程学习"
node index.js "旅游攻略"
```

### 运行流程
1. 自动启动浏览器访问小红书
2. 搜索指定关键词
3. 获取前5个帖子的详细信息
4. 抓取评论和作者作品
5. 生成JSON数据文件

## 项目结构

```
xiaohongshu-scraper/
├── index.js          # 主程序文件
├── package.json      # 项目配置和依赖
├── README.md         # 项目说明文档
├── .gitignore        # Git忽略文件配置
└── node_modules/     # 依赖包目录
```

##  输出数据格式

工具会生成 `xiaohongshu_关键词_data.json` 文件，包含以下信息：

```json
[
  {
    "id": "65f8a1b2c9d3e50001abcdef",
    "title": "前端开发学习路线分享",
    "content": "完整的前端学习路径...",
    "stats": {
      "likes": 156,
      "favorites": 89,
      "comments": 34
    },
    "comments": [
      {
        "content": "很实用的分享！",
        "likes": 5,
        "replies": []
      }
    ],
    "authorRecentPosts": [
      "Vue3 实战项目教程",
      "React Hooks 使用技巧"
    ],
    "keyword": "前端"
  }
]
```

## 配置说明

### 选择器配置
项目使用模块化的选择器配置，便于维护和更新：

```javascript
const SELECTORS = {
  SEARCH_PAGE: {
    container: '.feeds-container',
    postItem: 'section.note-item',
    postLink: 'a.cover.mask.ld',
    postTitle: 'a.title'
  }
  // 更多配置...
};
```

##  常见问题

### Q: 运行时报"元素未找到"错误？
**A:** 小红书页面结构可能已更新，需要检查并更新对应的CSS选择器。

### Q: 无法加载评论？
**A:** 部分内容需要登录才能查看，可以手动扫码登录后再运行脚本。

### Q: 运行速度太慢？
**A:** 可以调整配置参数：
```javascript
// 在 index.js 中修改
headless: true,  // 无界面模式
slowMo: 500,     // 减少延迟
```

## 作业要求完成情况

### 已实现核心功能
- 浏览器自动启动和搜索
- 帖子列表获取（前5个）
- 帖子详情信息提取
- 评论数据抓取
- 作者作品获取
- 数据导出为JSON格式
- 命令行参数支持

## 重要提示

1. **学习用途** - 本项目仅用于编程学习和技术研究
2. **遵守规则** - 请尊重网站规则，合理控制请求频率
3. **版权尊重** - 请勿将抓取数据用于商业用途

